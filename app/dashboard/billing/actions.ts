'use server'

import { getCurrentStore } from '@/lib/store'
import { getStripe } from '@/lib/stripe/client'
import { getBaseUrl } from '@/lib/baseUrl'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyPaymentClaimed } from '@/lib/notify'

/**
 * "Já paguei": o lojista declara que enviou o Pix. Como o QR é estático (o banco
 * não manda webhook), a fatura fica AGUARDANDO CONFIRMAÇÃO até alguém conferir o
 * extrato no /admin/faturas. Enquanto isso a loja não é suspensa.
 *
 * A fatura vem da SESSÃO, nunca do client — senão um lojista marcaria a fatura de outro.
 */
export async function claimInvoicePayment(): Promise<{ ok: boolean; error?: string }> {
  const { store } = await getCurrentStore()
  const admin = createAdminClient()

  const { data: invoice } = await admin
    .from('plan_invoices')
    .select('id, amount_cents, due_date')
    .eq('store_id', store.id)
    .in('status', ['open', 'overdue'])
    .order('due_date', { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string; amount_cents: number; due_date: string }>()

  if (!invoice) return { ok: false, error: 'Nenhuma fatura em aberto.' }

  const { error } = await admin
    .from('plan_invoices')
    .update({ status: 'awaiting_confirmation', payment_claimed_at: new Date().toISOString() })
    .eq('id', invoice.id)
    .in('status', ['open', 'overdue'])

  if (error) return { ok: false, error: 'Não foi possível registrar. Tente novamente.' }

  // Aviso pro admin conferir o extrato (best-effort, nunca derruba a declaração).
  await notifyPaymentClaimed({
    storeName: store.name,
    amountCents: invoice.amount_cents,
  })

  revalidatePath('/dashboard/billing')
  return { ok: true }
}

export async function openBillingPortal() {
  const { supabase, store } = await getCurrentStore()

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('store_id', store.id)
    .maybeSingle()

  if (!sub?.stripe_customer_id) {
    redirect('/dashboard/billing?error=no_subscription')
  }

  const stripe = getStripe()
  const base = getBaseUrl()

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${base}/dashboard/billing`,
  })

  redirect(portal.url)
}
