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
    })
    .eq('id', store.id)

  revalidatePath('/dashboard/loja')
  revalidatePath(`/loja/${store.slug}`)
}
