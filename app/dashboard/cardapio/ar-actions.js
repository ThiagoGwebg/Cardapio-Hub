'use server'

import { getCurrentStore } from '@/lib/store'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

/**
 * Ações da revisão do modelo 3D (RA). A geração em si acontece em
 * /api/ar/generate + /api/ar/status; aqui é só o que o lojista decide depois
 * que o modelo fica pronto: publicar no cardápio, descartar, ou tirar do ar.
 */

export async function publishArModel(productId, generationId) {
  const { supabase, store } = await getCurrentStore()

  const { data: gen } = await supabase
    .from('ar_generations')
    .select('id, status, model_url, size_cm')
    .eq('id', generationId)
    .eq('store_id', store.id)
    .eq('product_id', productId)
    .maybeSingle()
  if (!gen || gen.status !== 'ready' || !gen.model_url) return

  await supabase
    .from('products')
    .update({ ar_model_url: gen.model_url, ar_size_cm: gen.size_cm })
    .eq('id', productId)
    .eq('store_id', store.id)

  await supabase
    .from('ar_generations')
    .update({ status: 'published', updated_at: new Date().toISOString() })
    .eq('id', generationId)

  revalidatePath(`/dashboard/cardapio/${productId}`)
  revalidatePath('/dashboard/cardapio')
}

export async function discardArGeneration(productId, generationId) {
  const { supabase, store } = await getCurrentStore()

  const { data: gen } = await supabase
    .from('ar_generations')
    .select('id, status, model_url')
    .eq('id', generationId)
    .eq('store_id', store.id)
    .eq('product_id', productId)
    .maybeSingle()
  if (!gen || gen.status !== 'ready') return

  // O crédito da API já foi gasto — descartar NÃO devolve a cota do mês.
  await supabase
    .from('ar_generations')
    .update({ status: 'discarded', updated_at: new Date().toISOString() })
    .eq('id', generationId)

  removeStorageFile(gen.model_url)

  revalidatePath(`/dashboard/cardapio/${productId}`)
}

/** Tira o modelo do cardápio público (a geração continua no histórico). */
export async function removeArModel(productId) {
  const { supabase, store } = await getCurrentStore()

  const { data: product } = await supabase
    .from('products')
    .select('ar_model_url')
    .eq('id', productId)
    .eq('store_id', store.id)
    .maybeSingle()

  await supabase
    .from('products')
    .update({ ar_model_url: null, ar_size_cm: null })
    .eq('id', productId)
    .eq('store_id', store.id)

  // Volta a geração publicada para 'ready': o lojista pode republicar sem
  // gastar outra geração.
  await supabase
    .from('ar_generations')
    .update({ status: 'ready', updated_at: new Date().toISOString() })
    .eq('store_id', store.id)
    .eq('product_id', productId)
    .eq('status', 'published')
    .eq('model_url', product?.ar_model_url ?? '')

  revalidatePath(`/dashboard/cardapio/${productId}`)
  revalidatePath('/dashboard/cardapio')
}

/** Apaga o .glb do Storage a partir da URL pública (melhor esforço). */
function removeStorageFile(publicUrl) {
  if (!publicUrl) return
  const marker = '/storage/v1/object/public/store-assets/'
  const i = publicUrl.indexOf(marker)
  if (i === -1) return
  const path = decodeURIComponent(publicUrl.slice(i + marker.length))
  createAdminClient()
    .storage.from('store-assets')
    .remove([path])
    .catch(() => {})
}
