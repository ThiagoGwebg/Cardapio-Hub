import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import webpush from 'web-push'

export const runtime = 'nodejs'

function fmt(cents?: number) {
  return 'R$ ' + ((cents || 0) / 100).toFixed(2).replace('.', ',')
}

// Chamado pelo gatilho do banco (pg_net) a cada pedido novo. Envia o push
// pra todos os aparelhos inscritos da loja. Protegido por segredo compartilhado.
export async function POST(req: NextRequest) {
  if (req.headers.get('x-push-secret') !== process.env.PUSH_HOOK_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) {
    // Sem chaves configuradas ainda — não faz nada (degradação segura).
    return NextResponse.json({ ok: false, reason: 'vapid-not-configured' })
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:contato@cardapiohub.com.br', pub, priv)

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

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, subscription')
    .eq('store_id', storeId)
  if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 })

  const payload = JSON.stringify({
    title: '🔔 Novo pedido!',
    body: customerName
      ? `${customerName} • ${fmt(totalCents)}`
      : `Você recebeu um novo pedido • ${fmt(totalCents)}`,
    url: '/dashboard/pedidos',
  })

  const dead: string[] = []
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(s.subscription as unknown as import('web-push').PushSubscription, payload)
      } catch (e) {
        const code = (e as { statusCode?: number })?.statusCode
        if (code === 404 || code === 410) dead.push(s.endpoint)
      }
    })
  )
  if (dead.length) await admin.from('push_subscriptions').delete().in('endpoint', dead)

  return NextResponse.json({ ok: true, sent: subs.length - dead.length })
}
