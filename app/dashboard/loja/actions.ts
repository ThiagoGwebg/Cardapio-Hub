'use server'

import { getCurrentStore } from '@/lib/store'
import { createAdminClient } from '@/lib/supabase/admin'
import { isStorePro, DEFAULT_STORE_FONT } from '@/lib/plan'
import {
  type StoreTheme,
  sanitizeHexColor,
  sanitizeMenuLayout,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  DEFAULT_ACCENT_COLOR,
} from '@/lib/storeTheme'
import { revalidatePath } from 'next/cache'

/**
 * Remove do Storage o arquivo antigo quando a imagem é trocada/removida,
 * evitando arquivos órfãos. Só mexe em objetos do bucket 'store-assets'.
 */
async function removeOldAsset(oldUrl?: string, newUrl?: string) {
  if (!oldUrl || oldUrl === newUrl) return
  const marker = '/store-assets/'
  const i = oldUrl.indexOf(marker)
  if (i === -1) return
  const path = decodeURIComponent(oldUrl.slice(i + marker.length).split('?')[0])
  if (!path) return
  try {
    await createAdminClient().storage.from('store-assets').remove([path])
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

  // Regra de planos para os metadados visuais salvos no JSONB `stores.theme`:
  //  • Logo e banner: liberados em TODOS os planos.
  //  • Personalização avançada (cores primária/secundária/accent, fonte, layout do
  //    cardápio e aviso promocional): EXCLUSIVA do Pro. No Free preservamos os valores
  //    atuais — o gate acontece aqui no servidor, nunca confiamos só na UI.
  const current = (store.theme ?? {}) as StoreTheme
  const pro = await isStorePro(supabase, store.id)

  const theme: StoreTheme = {
    logoUrl: String(formData.get('logoUrl') || ''),
    bannerUrl: String(formData.get('bannerUrl') || ''),

    // Cores: só no Pro. Todo hex passa por sanitização (#rgb/#rrggbb) antes de salvar,
    // caindo no padrão se vier algo inválido. No Free, mantém o que já estava.
    primaryColor: pro
      ? sanitizeHexColor(String(formData.get('primaryColor') || ''), current.primaryColor || DEFAULT_PRIMARY_COLOR)
      : current.primaryColor || DEFAULT_PRIMARY_COLOR,
    secondaryColor: pro
      ? sanitizeHexColor(String(formData.get('secondaryColor') || ''), current.secondaryColor || DEFAULT_SECONDARY_COLOR)
      : current.secondaryColor,
    accentColor: pro
      ? sanitizeHexColor(String(formData.get('accentColor') || ''), current.accentColor || DEFAULT_ACCENT_COLOR)
      : current.accentColor,

    // Fonte: só no Pro. No Free preserva o valor atual (undefined = fonte padrão).
    font: pro ? String(formData.get('font') || current.font || DEFAULT_STORE_FONT) : current.font,

    // Layout do cardápio (grid/list): só no Pro. Valor desconhecido cai no default.
    menuLayout: pro ? sanitizeMenuLayout(String(formData.get('menuLayout') || '')) : current.menuLayout,

    // Aviso promocional: só no Pro (string vazia oculta o aviso).
    announcement: pro
      ? String(formData.get('announcement') || '').trim().slice(0, 120) || undefined
      : current.announcement,
  }

  // Limpa logo/banner antigos do Storage quando forem trocados ou removidos.
  await removeOldAsset(current.logoUrl, theme.logoUrl)
  await removeOldAsset(current.bannerUrl, theme.bannerUrl)

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

// Ação dedicada só pro pagamento online — separada do updateStore pra que conectar o Mercado Pago
// (que navega pra fora do form) não faça o lojista perder as outras edições não salvas.
export async function updateOnlinePayment(formData: FormData) {
  const { supabase, store } = await getCurrentStore()
  await supabase
    .from('stores')
    .update({ online_payment_enabled: formData.get('onlinePaymentEnabled') === 'on' })
    .eq('id', store.id)
  revalidatePath('/dashboard/loja')
  revalidatePath(`/loja/${store.slug}`)
}

/**
 * Desvincula a conta Mercado Pago da loja: apaga as credenciais OAuth e desliga o
 * pagamento online. Precisa do admin client porque `store_payment_credentials` tem
 * RLS deny-all (nem o dono da loja lê/apaga direto) — a autorização vem de
 * getCurrentStore(), que garante que é o dono logado.
 */
export async function disconnectMercadoPago() {
  const { supabase, store } = await getCurrentStore()

  await createAdminClient().from('store_payment_credentials').delete().eq('store_id', store.id)

  // Desliga o toggle junto: deixar ligado sem conta conectada só confunde a UI.
  await supabase
    .from('stores')
    .update({ mp_connected: false, online_payment_enabled: false })
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
