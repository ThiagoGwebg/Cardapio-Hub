import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function fmt(cents?: number) {
  return 'R$ ' + ((cents || 0) / 100).toFixed(2).replace('.', ',')
}

// Chamado pelo gatilho do banco (pg_net) a cada pedido novo — mesmo contrato de sempre
// (URL, header x-push-secret e body), só a entrega que agora é via OneSignal em vez de
// web-push. O aparelho do lojista se marca com a tag store_id ao ativar os alertas
// (lib/onesignal.ts), então mandamos filtrando por essa tag.
export async function POST(req: NextRequest) {
  if (req.headers.get('x-push-secret') !== process.env.PUSH_HOOK_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
  const apiKey = process.env.ONESIGNAL_REST_API_KEY
  if (!appId || !apiKey) {
    // Sem chaves configuradas ainda — não faz nada (degradação segura).
    return NextResponse.json({ ok: false, reason: 'onesignal-not-configured' })
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const storeId = body.store_id as string | undefined
  const orderId = body.order_id as string | undefined
  if (!storeId) return NextResponse.json({ error: 'no store' }, { status: 400 })

  const admin = createAdminClient()

  // O gatilho dispara AFTER INSERT, quando o pedido ainda está com total_cents = 0
  // (a create_order só grava o valor final num UPDATE posterior). O pg_net envia o
  // HTTP após o commit, então relemos o pedido do banco para ter o total correto —
  // caso contrário a notificação mostraria "R$ 0,00".
  let customerName = body.customer_name as string | undefined
  let totalCents = body.total_cents as number | undefined
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
