'use server'

import { getCurrentStore } from '@/lib/store'
import { getStripe } from '@/lib/stripe/client'
import { redirect } from 'next/navigation'

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
