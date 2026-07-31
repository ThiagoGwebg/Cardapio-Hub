import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { mpFetch, verifyWebhookSignature } from '@/lib/mercadopago/client'
import { getPlatformMpToken, markInvoicePaid, type PlanInvoice } from '@/lib/billing/invoices'

export const runtime = 'nodejs'

type MpPayment = {
  id: number
  status: string
  external_reference?: string
  transaction_amount?: number
  currency_id?: string
}

// Webhook da conta Mercado Pago DA PLATAFORMA: confirma o Pix da mensalidade do lojista
// e devolve a loja ao ar. Separado de /api/webhooks/mercadopago (aquele é a conta do
// LOJISTA recebendo do cliente final) porque a conta e o segredo são outros.
export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const raw = await request.text()
  let body: { type?: string; topic?: string; data?: { id?: string } } = {}
  try {
    body = raw ? JSON.parse(raw) : {}
  } catch {
    body = {}
  }

  const dataId = url.searchParams.get('data.id') || body.data?.id || url.searchParams.get('id') || null
  const type = body.type || body.topic || url.searchParams.get('type') || url.searchParams.get('topic')

  const valid = verifyWebhookSignature({
    xSignature: request.headers.get('x-signature'),
    xRequestId: request.headers.get('x-request-id'),
    dataId: dataId ? dataId.toLowerCase() : null,
    secret: process.env.MP_PLATFORM_WEBHOOK_SECRET,
  })
  if (!valid) return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })

  if (type !== 'payment' || !dataId) return NextResponse.json({ received: true })

  const token = getPlatformMpToken()
  if (!token) return NextResponse.json({ received: true })

  const admin = createAdminClient()
  const { data: invoice } = await admin
    .from('plan_invoices')
    .select('*')
    .eq('provider_payment_id', dataId)
    .maybeSingle<PlanInvoice>()

  if (!invoice) return NextResponse.json({ received: true })

  let payment: MpPayment
  try {
    payment = await mpFetch<MpPayment>(`/v1/payments/${dataId}`, { accessToken: token })
  } catch {
    // Transitório: 500 faz o MP reenviar depois.
    return NextResponse.json({ error: 'Falha ao consultar pagamento' }, { status: 500 })
  }

  // O pagamento tem que apontar pra ESTA fatura.
  if (payment.external_reference && payment.external_reference !== `invoice:${invoice.id}`) {
    return NextResponse.json({ received: true })
  }

  if (payment.status === 'approved') {
    // Nunca liberar por status só: confere valor e moeda.
    const paidCents = Math.round((payment.transaction_amount ?? 0) * 100)
    if (paidCents !== invoice.amount_cents || (payment.currency_id && payment.currency_id !== 'BRL')) {
      return NextResponse.json({ received: true })
    }
    await markInvoicePaid(invoice)
  }

  return NextResponse.json({ received: true })
}
