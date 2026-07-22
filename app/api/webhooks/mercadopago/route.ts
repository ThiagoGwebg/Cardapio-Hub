import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFreshSellerToken } from '@/lib/mercadopago/tokens'
import { mpFetch, verifyWebhookSignature } from '@/lib/mercadopago/client'

export const runtime = 'nodejs'

type MpPayment = {
  id: number
  status: string
  external_reference?: string
  transaction_amount?: number
  currency_id?: string
}

// Webhook do Mercado Pago: confirma o pagamento e SÓ ENTÃO libera o pedido pro lojista.
export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const raw = await request.text()
  let body: { type?: string; topic?: string; action?: string; data?: { id?: string } } = {}
  try {
    body = raw ? JSON.parse(raw) : {}
  } catch {
    body = {}
  }

  // data.id pode vir na query (?data.id=) ou no corpo.
  const dataId = url.searchParams.get('data.id') || body.data?.id || url.searchParams.get('id') || null
  const type = body.type || body.topic || url.searchParams.get('type') || url.searchParams.get('topic')

  // Valida a assinatura (x-signature). Rejeita o que não for legítimo.
  const valid = verifyWebhookSignature({
    xSignature: request.headers.get('x-signature'),
    xRequestId: request.headers.get('x-request-id'),
    dataId: dataId ? dataId.toLowerCase() : null,
  })
  if (!valid) return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })

  // Só tratamos notificações de pagamento.
  if (type !== 'payment' || !dataId) return NextResponse.json({ received: true })

  const admin = createAdminClient()

  // Descobrimos o pedido/loja pela cobrança que nós mesmos registramos.
  const { data: op } = await admin
    .from('order_payments')
    .select('id, order_id, store_id, status, amount_cents')
    .eq('provider_payment_id', dataId)
    .maybeSingle()

  if (!op) return NextResponse.json({ received: true })

  // Busca o pagamento no MP (com o token do lojista) pra confirmar o status real.
  const seller = await getFreshSellerToken(op.store_id)
  if (!seller) return NextResponse.json({ received: true })

  let payment: MpPayment
  try {
    payment = await mpFetch<MpPayment>(`/v1/payments/${dataId}`, { accessToken: seller.accessToken })
  } catch {
    // Erro transitório: devolve 500 pro MP reenviar depois.
    return NextResponse.json({ error: 'Falha ao consultar pagamento' }, { status: 500 })
  }

  // Defesa: o pagamento tem que apontar pro MESMO pedido que registramos.
  if (payment.external_reference && payment.external_reference !== op.order_id) {
    return NextResponse.json({ received: true })
  }

  if (payment.status === 'approved') {
    // Só libera se o valor E a moeda batem com o que cobramos (nunca liberar por status só).
    const paidCents = Math.round((payment.transaction_amount ?? 0) * 100)
    const amountOk = paidCents === op.amount_cents
    const currencyOk = !payment.currency_id || payment.currency_id === 'BRL'
    if (!amountOk || !currencyOk) {
      // Valor divergente: marca pra revisão manual, NÃO libera o pedido automaticamente.
      await admin.from('order_payments').update({ status: 'amount_mismatch' }).eq('id', op.id)
      return NextResponse.json({ received: true })
    }
    // Idempotente: só age se ainda estava pendente E o pedido não foi cancelado nesse meio-tempo.
    await admin.from('order_payments').update({ status: 'paid' }).eq('id', op.id)
    await admin
      .from('orders')
      .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', op.order_id)
      .eq('payment_status', 'pending')
      .neq('status', 'cancelado')
  } else if (['refunded', 'charged_back'].includes(payment.status)) {
    // Estorno/chargeback depois de pago: registra e reverte o status do pedido.
    await admin.from('order_payments').update({ status: 'refunded' }).eq('id', op.id)
    await admin.from('orders').update({ payment_status: 'refunded' }).eq('id', op.order_id)
  } else if (['rejected', 'cancelled'].includes(payment.status)) {
    await admin.from('order_payments').update({ status: 'failed' }).eq('id', op.id)
  } else if (payment.status === 'expired') {
    await admin.from('order_payments').update({ status: 'expired' }).eq('id', op.id)
  }

  return NextResponse.json({ received: true })
}
