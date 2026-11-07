import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function fmt(cents) {
  return 'R$ ' + ((cents || 0) / 100).toFixed(2).replace('.', ',')
}

/**
 * Confere o header contra os segredos aceitos.
 *
 * PUSH_HOOK_SECRET aceita mais de um valor separado por vírgula só por causa da
 * janela de rotação: o gatilho do banco e a variável da Vercel não trocam no
 * mesmo instante, e com um valor só qualquer ordem derruba a notificação de
 * pedido no intervalo. Com os dois aceitos, troca-se um lado de cada vez e
 * depois remove-se o antigo. Um valor sem vírgula se comporta como antes.
 *
 * Comparação em tempo constante porque `!==` sai no primeiro byte diferente, o
 * que vaza o prefixo correto para quem medir o tempo de resposta.
 */
function segredoConfere(recebido) {
  const aceitos = (process.env.PUSH_HOOK_SECRET || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!aceitos.length || !recebido) return false

  const enviado = Buffer.from(recebido)
  return aceitos.some((aceito) => {
    const esperado = Buffer.from(aceito)
    // timingSafeEqual exige o mesmo tamanho; o tamanho em si não é segredo.
    return esperado.length === enviado.length && timingSafeEqual(esperado, enviado)
  })
}

// Chamado pelo gatilho do banco (pg_net) a cada pedido novo — mesmo contrato de sempre
// (URL, header x-push-secret e body), só a entrega que agora é via OneSignal em vez de
// web-push. O aparelho do lojista se marca com a tag store_id ao ativar os alertas
// (lib/onesignal.js), então mandamos filtrando por essa tag.
export async function POST(req) {
  if (!segredoConfere(req.headers.get('x-push-secret'))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
  const apiKey = process.env.ONESIGNAL_REST_API_KEY
  if (!appId || !apiKey) {
    // Sem chaves configuradas ainda — não faz nada (degradação segura).
    return NextResponse.json({ ok: false, reason: 'onesignal-not-configured' })
  }

  const body = await req.json().catch(() => ({}))
  const storeId = body.store_id;
  const orderId = body.order_id;
  if (!storeId) return NextResponse.json({ error: 'no store' }, { status: 400 })

  const admin = createAdminClient()

  // O gatilho dispara AFTER INSERT, quando o pedido ainda está com total_cents = 0
  // (a create_order só grava o valor final num UPDATE posterior). O pg_net envia o
  // HTTP após o commit, então relemos o pedido do banco para ter o total correto —
  // caso contrário a notificação mostraria "R$ 0,00".
  let customerName = body.customer_name;
  let totalCents = body.total_cents;
  if (orderId) {
    const { data: order } = await admin
      .from('orders')
      .select('customer_name, total_cents')
      .eq('id', orderId)
      .maybeSingle()
    if (order) {
      customerName = order.customer_name || customerName
      totalCents = order.total_cents ?? totalCents
    }
  }

  const res = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify({
      app_id: appId,
      filters: [{ field: 'tag', key: 'store_id', relation: '=', value: storeId }],
      headings: { en: '🔔 Novo pedido!' },
      contents: {
        en: customerName ? `${customerName} • ${fmt(totalCents)}` : `Você recebeu um novo pedido • ${fmt(totalCents)}`,
      },
      web_url: 'https://cardapioagil.vercel.app/dashboard/pedidos',
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    return NextResponse.json({ ok: false, error: detail }, { status: 502 })
  }

  const data = await res.json().catch(() => ({}))
  return NextResponse.json({ ok: true, recipients: data.recipients ?? 0 })
}
