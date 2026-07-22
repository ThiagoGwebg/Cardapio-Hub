import { NextRequest, NextResponse } from 'next/server'
import { getBaseUrl } from '@/lib/baseUrl'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFreshSellerToken } from '@/lib/mercadopago/tokens'
import { mpFetch } from '@/lib/mercadopago/client'

export const runtime = 'nodejs'

type MpPayment = {
  id: number
  status: string
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string
      qr_code_base64?: string
      ticket_url?: string
    }
  }
}

// Cria (ou reaproveita) a cobrança Pix de um pedido na conta Mercado Pago do lojista.
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await ctx.params
  const admin = createAdminClient()

  const { data: order } = await admin
    .from('orders')
    .select('id, store_id, total_cents, payment_method, payment_status, customer_name, source')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  if (order.payment_status === 'paid') {
    return NextResponse.json({ status: 'paid' })
  }
  if (order.payment_status !== 'pending') {
    return NextResponse.json({ error: 'Pedido não requer pagamento online' }, { status: 400 })
  }

  // Já existe uma cobrança pendente e ainda válida? Reaproveita (evita QR duplicado).
  const { data: existing } = await admin
    .from('order_payments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (
    existing &&
    existing.status === 'pending' &&
    existing.qr_code &&
    (!existing.expires_at || new Date(existing.expires_at).getTime() > Date.now())
  ) {
    return NextResponse.json({
      status: 'pending',
      qr_code: existing.qr_code,
      qr_code_base64: existing.qr_code_base64,
      ticket_url: existing.ticket_url,
      expires_at: existing.expires_at,
    })
  }

  const seller = await getFreshSellerToken(order.store_id)
  if (!seller) {
    return NextResponse.json({ error: 'Loja sem pagamento online configurado' }, { status: 400 })
  }

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // Pix válido por 30 min
  const payerEmail = `pedido-${orderId.slice(0, 8)}@checkout.cardapiohub.app`

  // Idempotência por TENTATIVA: chamadas concorrentes da mesma tentativa reaproveitam a cobrança
  // no MP; já uma nova tentativa (ex.: Pix anterior expirou) gera um Pix novo de verdade.
  const { count: attemptCount } = await admin
    .from('order_payments')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', orderId)

  let payment: MpPayment
  try {
    payment = await mpFetch<MpPayment>('/v1/payments', {
      accessToken: seller.accessToken,
      idempotencyKey: `order-${orderId}-${attemptCount ?? 0}`,
      body: {
        transaction_amount: Number((order.total_cents / 100).toFixed(2)),
        description: `Pedido em ${order.customer_name || 'Cardápio Hub'}`,
        payment_method_id: 'pix',
        external_reference: orderId,
        notification_url: `${getBaseUrl()}/api/webhooks/mercadopago`,
        date_of_expiration: expiresAt.toISOString().replace('Z', '+00:00'),
        payer: { email: payerEmail },
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha ao gerar o Pix' },
      { status: 502 }
    )
  }

  const td = payment.point_of_interaction?.transaction_data

  const { error: insErr } = await admin.from('order_payments').insert({
    order_id: orderId,
    store_id: order.store_id,
    provider: 'mercadopago',
    provider_payment_id: String(payment.id),
    method: 'pix',
    amount_cents: order.total_cents,
    status: payment.status === 'approved' ? 'paid' : 'pending',
    qr_code: td?.qr_code ?? null,
    qr_code_base64: td?.qr_code_base64 ?? null,
    ticket_url: td?.ticket_url ?? null,
    expires_at: expiresAt.toISOString(),
    raw: payment as unknown as Record<string, unknown>,
  })

  // Sem a linha em order_payments o webhook não consegue resolver o pedido → o pagamento nunca
  // seria confirmado. Falha aqui é 500 pro cliente reprocessar (a chave idempotente é estável
  // enquanto não houver linha nova, então o retry reaproveita a MESMA cobrança no MP).
  if (insErr) {
    return NextResponse.json({ error: 'Falha ao registrar a cobrança' }, { status: 500 })
  }

  await admin.from('orders').update({ payment_provider: 'mercadopago' }).eq('id', orderId)

  // Se por acaso já veio aprovado, confirma na hora (o webhook também trata isso).
  if (payment.status === 'approved') {
    await admin
      .from('orders')
      .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('payment_status', 'pending')
    return NextResponse.json({ status: 'paid' })
  }

  return NextResponse.json({
    status: 'pending',
    qr_code: td?.qr_code ?? null,
    qr_code_base64: td?.qr_code_base64 ?? null,
    ticket_url: td?.ticket_url ?? null,
    expires_at: expiresAt.toISOString(),
  })
}
