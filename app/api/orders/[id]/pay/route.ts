import { NextRequest, NextResponse } from 'next/server'
import { getBaseUrl } from '@/lib/baseUrl'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFreshSellerToken } from '@/lib/mercadopago/tokens'
import { mpFetch } from '@/lib/mercadopago/client'

export const runtime = 'nodejs'

type MpPayment = {
  id: number
  status: string
  status_detail?: string
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string
      qr_code_base64?: string
      ticket_url?: string
    }
  }
}

// Dados que o Card Payment Brick (Mercado Pago) envia no onSubmit.
type CardFormData = {
  token?: string
  payment_method_id?: string
  issuer_id?: string
  installments?: number
  payer?: {
    email?: string
    identification?: { type?: string; number?: string }
  }
}

// Config pública pro checkout de cartão: a public_key do LOJISTA (o token do cartão
// precisa ser gerado com a mesma conta que cria a cobrança) + o valor do pedido.
export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await ctx.params
  const admin = createAdminClient()

  const { data: order } = await admin
    .from('orders')
    .select('id, store_id, total_cents, payment_method, payment_status')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  if (order.payment_status !== 'pending') {
    return NextResponse.json({ error: 'Pedido não requer pagamento online' }, { status: 400 })
  }

  const { data: cred } = await admin
    .from('store_payment_credentials')
    .select('public_key')
    .eq('store_id', order.store_id)
    .maybeSingle()

  if (!cred?.public_key) {
    return NextResponse.json({ error: 'Loja sem pagamento online configurado' }, { status: 400 })
  }

  return NextResponse.json({ public_key: cred.public_key, amount_cents: order.total_cents })
}

// Cria a cobrança online de um pedido na conta Mercado Pago do lojista.
// Sem corpo (ou sem token) = Pix; com o formData do Card Payment Brick = cartão.
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await ctx.params
  const admin = createAdminClient()

  let card: CardFormData | null = null
  try {
    const body = await request.json()
    if (body && typeof body.token === 'string' && body.token) card = body as CardFormData
  } catch {
    // corpo vazio → fluxo Pix
  }

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

  const seller = await getFreshSellerToken(order.store_id)
  if (!seller) {
    return NextResponse.json({ error: 'Loja sem pagamento online configurado' }, { status: 400 })
  }

  const amount = Number((order.total_cents / 100).toFixed(2))
  const description = `Pedido em ${order.customer_name || 'Cardápio Hub'}`
  const fallbackEmail = `pedido-${orderId.slice(0, 8)}@checkout.cardapiohub.app`

  // Idempotência por TENTATIVA: chamadas concorrentes da mesma tentativa reaproveitam a cobrança
  // no MP; já uma nova tentativa (ex.: Pix expirou, cartão recusado) gera uma cobrança nova.
  const { count: attemptCount } = await admin
    .from('order_payments')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', orderId)

  // ---------- Cartão de crédito/débito (checkout transparente) ----------
  if (card) {
    let payment: MpPayment
    try {
      payment = await mpFetch<MpPayment>('/v1/payments', {
        accessToken: seller.accessToken,
        idempotencyKey: `order-${orderId}-card-${attemptCount ?? 0}`,
        body: {
          transaction_amount: amount,
          description,
          token: card.token,
          payment_method_id: card.payment_method_id,
          issuer_id: card.issuer_id ? Number(card.issuer_id) : undefined,
          installments: Number(card.installments || 1),
          external_reference: orderId,
          notification_url: `${getBaseUrl()}/api/webhooks/mercadopago`,
          payer: {
            email: card.payer?.email || fallbackEmail,
            identification: card.payer?.identification,
          },
        },
      })
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Falha ao processar o cartão' },
        { status: 502 }
      )
    }

    const approved = payment.status === 'approved'
    const rejected = ['rejected', 'cancelled'].includes(payment.status)

    // Registra a tentativa SEMPRE: o webhook resolve o pedido por essa linha, e a contagem
    // de tentativas (idempotência) depende dela mesmo quando o cartão é recusado.
    const { error: insErr } = await admin.from('order_payments').insert({
      order_id: orderId,
      store_id: order.store_id,
      provider: 'mercadopago',
      provider_payment_id: String(payment.id),
      method: 'card',
      amount_cents: order.total_cents,
      status: approved ? 'paid' : rejected ? 'failed' : 'pending',
      raw: payment as unknown as Record<string, unknown>,
    })
    if (insErr) {
      return NextResponse.json({ error: 'Falha ao registrar a cobrança' }, { status: 500 })
    }

    await admin.from('orders').update({ payment_provider: 'mercadopago' }).eq('id', orderId)

    if (approved) {
      await admin
        .from('orders')
        .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('payment_status', 'pending')
      return NextResponse.json({ status: 'paid' })
    }
    if (rejected) {
      return NextResponse.json({ status: 'rejected', status_detail: payment.status_detail ?? null })
    }
    // in_process etc.: o webhook confirma depois; o cliente segue vendo "aguardando".
    return NextResponse.json({ status: 'pending', status_detail: payment.status_detail ?? null })
  }

  // ---------- Pix ----------
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

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // Pix válido por 30 min

  let payment: MpPayment
  try {
    payment = await mpFetch<MpPayment>('/v1/payments', {
      accessToken: seller.accessToken,
      idempotencyKey: `order-${orderId}-${attemptCount ?? 0}`,
      body: {
        transaction_amount: amount,
        description,
        payment_method_id: 'pix',
        external_reference: orderId,
        notification_url: `${getBaseUrl()}/api/webhooks/mercadopago`,
        date_of_expiration: expiresAt.toISOString().replace('Z', '+00:00'),
        payer: { email: fallbackEmail },
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
