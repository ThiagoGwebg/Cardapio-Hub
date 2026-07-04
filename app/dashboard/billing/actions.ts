'use server'

import { getCurrentStore } from '@/lib/store'
import { getStripe } from '@/lib/stripe/client'
import { STRIPE_PRO_PRICE_ID } from '@/lib/stripe/plans'
import { redirect } from 'next/navigation'

export async function startCheckout() {
  const { store } = await getCurrentStore()

  if (!STRIPE_PRO_PRICE_ID) {
    redirect('/dashboard/billing?error=stripe_not_configured')
  }

  const stripe = getStripe()
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: STRIPE_PRO_PRICE_ID, quantity: 1 }],
    client_reference_id: store.id,
    success_url: `${base}/dashboard/billing?success=1`,
    cancel_url: `${base}/dashboard/billing?canceled=1`,
  })

  redirect(session.url!)
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
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${base}/dashboard/billing`,
  })

  redirect(portal.url)
}
