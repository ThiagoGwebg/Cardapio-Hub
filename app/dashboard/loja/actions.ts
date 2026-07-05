'use server'

import { getCurrentStore } from '@/lib/store'
import { revalidatePath } from 'next/cache'

export async function updateStore(formData: FormData) {
  const { supabase, store } = await getCurrentStore()

  const name = String(formData.get('name') || store.name)
  const address = String(formData.get('address') || '')
  const whatsapp_number = String(formData.get('whatsapp') || '')
  const is_open = formData.get('isOpen') === 'on'
  const min_order = Number(formData.get('minOrder') || 0)

  const theme = {
    primaryColor: String(formData.get('primaryColor') || '#FF5722'),
    logoUrl: String(formData.get('logoUrl') || ''),
    bannerUrl: String(formData.get('bannerUrl') || ''),
  }

  await supabase
    .from('stores')
    .update({
      name,
      address,
      whatsapp_number,
      is_open,
      min_order_cents: Math.round(min_order * 100),
      theme,
      delivery_enabled: formData.get('deliveryEnabled') === 'on',
      pickup_enabled: formData.get('pickupEnabled') === 'on',
      dine_in_enabled: formData.get('dineInEnabled') === 'on',
      delivery_fee_cents: Math.round(Number(formData.get('deliveryFee') || 0) * 100),
      estimated_prep_min: Number(formData.get('prepMin') || 30),
      estimated_delivery_min: Number(formData.get('deliveryMin') || 45),
      accepts_cash: formData.get('acceptsCash') === 'on',
      accepts_card: formData.get('acceptsCard') === 'on',
      accepts_pix: formData.get('acceptsPix') === 'on',
      pix_key: String(formData.get('pixKey') || '') || null,
      checkout_mode: formData.get('checkoutMode') === 'system' ? 'system' : 'whatsapp',
    })
    .eq('id', store.id)

  revalidatePath('/dashboard/loja')
  revalidatePath(`/loja/${store.slug}`)
}

export async function addZone(formData: FormData) {
  const { supabase, store } = await getCurrentStore()
  const neighborhood = String(formData.get('neighborhood') || '').trim()
  if (!neighborhood) return
  await supabase.from('delivery_zones').insert({
    store_id: store.id,
    neighborhood,
    fee_cents: Math.round(Number(formData.get('fee') || 0) * 100),
    min_order_cents: Math.round(Number(formData.get('zoneMin') || 0) * 100),
  })
  revalidatePath('/dashboard/loja')
  revalidatePath(`/loja/${store.slug}`)
}

export async function deleteZone(zoneId: string) {
  const { supabase, store } = await getCurrentStore()
  await supabase.from('delivery_zones').delete().eq('id', zoneId).eq('store_id', store.id)
  revalidatePath('/dashboard/loja')
  revalidatePath(`/loja/${store.slug}`)
}
