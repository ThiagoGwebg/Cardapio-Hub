'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { getCurrentStore } from '@/lib/store'
import { isStorePro, DEFAULT_STORE_FONT } from '@/lib/plan'
import { revalidatePath } from 'next/cache'

type Theme = { primaryColor?: string; logoUrl?: string; bannerUrl?: string; font?: string }

/**
 * Remove do Storage o arquivo antigo quando a imagem é trocada/removida,
 * evitando arquivos órfãos. Só mexe em objetos do bucket 'store-assets'.
 */
async function removeOldAsset(supabase: SupabaseClient, oldUrl?: string, newUrl?: string) {
  if (!oldUrl || oldUrl === newUrl) return
  const marker = '/store-assets/'
  const i = oldUrl.indexOf(marker)
  if (i === -1) return
  const path = decodeURIComponent(oldUrl.slice(i + marker.length).split('?')[0])
  if (!path) return
  try {
    await supabase.storage.from('store-assets').remove([path])
  } catch {
    // silencioso: a falha de limpeza não deve quebrar o salvamento
  }
}

export async function updateStore(formData: FormData) {
  const { supabase, store } = await getCurrentStore()

  const name = String(formData.get('name') || store.name)
  const address = String(formData.get('address') || '')
  const whatsapp_number = String(formData.get('whatsapp') || '')
  const is_open = formData.get('isOpen') === 'on'
  const min_order = Number(formData.get('minOrder') || 0)

  // Logo e banner: liberados em todos os planos.
  // Cor e fonte: só no Pro — no Free preservamos os valores atuais (gate no servidor).
  const current = (store.theme ?? {}) as Theme
  const pro = await isStorePro(supabase, store.id)

  const theme: Theme = {
    logoUrl: String(formData.get('logoUrl') || ''),
    bannerUrl: String(formData.get('bannerUrl') || ''),
    primaryColor: pro
      ? String(formData.get('primaryColor') || current.primaryColor || '#FF5722')
      : current.primaryColor || '#FF5722',
    // Fonte: só no Pro. No Free preserva o valor atual (undefined = fonte padrão).
    font: pro ? String(formData.get('font') || current.font || DEFAULT_STORE_FONT) : current.font,
  }

  // Limpa logo/banner antigos do Storage quando forem trocados ou removidos.
  await removeOldAsset(supabase, current.logoUrl, theme.logoUrl)
  await removeOldAsset(supabase, current.bannerUrl, theme.bannerUrl)

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
      pix_key_type: String(formData.get('pixKeyType') || '') || null,
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
