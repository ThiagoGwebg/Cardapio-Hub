'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStore } from '@/lib/store'
import { getStoreUsage } from '@/lib/plan'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function toggleProduct(productId: string, isActive: boolean) {
  const supabase = await createClient()
  await supabase.from('products').update({ is_active: isActive }).eq('id', productId)
  revalidatePath('/dashboard/cardapio')
}

// Aceita tanto o campo novo (images = JSON de URLs) quanto o antigo (imageUrl único).
function parseImages(formData: FormData): string[] {
  const raw = String(formData.get('images') || '')
  if (raw) {
    try {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) {
        return [...new Set(arr.map((u) => String(u).trim()).filter(Boolean))].slice(0, 8)
      }
    } catch {
      // formato inválido — cai no fallback abaixo
    }
  }
  const single = String(formData.get('imageUrl') || '').trim()
  return single ? [single] : []
}

async function resolveCategoryId(
  supabase: Awaited<ReturnType<typeof getCurrentStore>>['supabase'],
  storeId: string,
  categoryName: string
): Promise<string | undefined> {
  const name = categoryName.trim() || 'Geral'
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('store_id', storeId)
    .eq('name', name)
    .maybeSingle()
  if (category) return category.id

  const { data: created } = await supabase
    .from('categories')
    .insert({ store_id: storeId, name })
    .select('id')
    .single()
  return created?.id
}

export async function createProduct(formData: FormData) {
  const { supabase, store } = await getCurrentStore()

  // Gate no servidor: o Free tem limite de produtos (não confiar só na UI).
  const usage = await getStoreUsage(supabase, store.id)
  if (usage.productCount >= usage.maxProducts) {
    redirect('/dashboard/cardapio?limit=1')
  }

  const name = String(formData.get('name') || '')
  const priceReais = Number(formData.get('price') || 0)
  const description = String(formData.get('description') || '')
  const images = parseImages(formData)
  const categoryId = await resolveCategoryId(supabase, store.id, String(formData.get('category') || 'Geral'))

  if (!name || !priceReais) return

  await supabase.from('products').insert({
    store_id: store.id,
    category_id: categoryId,
    name,
    description,
    price_cents: Math.round(priceReais * 100),
    image_url: images[0] || null,
    images,
  })

  revalidatePath('/dashboard/cardapio')
}

export async function updateProduct(productId: string, formData: FormData) {
  const { supabase, store } = await getCurrentStore()

  const name = String(formData.get('name') || '').trim()
  const priceReais = Number(formData.get('price') || 0)
  const description = String(formData.get('description') || '')
  const images = parseImages(formData)
  const categoryId = await resolveCategoryId(supabase, store.id, String(formData.get('category') || 'Geral'))

  if (!name || !priceReais) return

  await supabase
    .from('products')
    .update({
      name,
      description,
      price_cents: Math.round(priceReais * 100),
      category_id: categoryId,
      image_url: images[0] || null,
      images,
    })
    .eq('id', productId)
    .eq('store_id', store.id)

  revalidatePath('/dashboard/cardapio')
  revalidatePath(`/dashboard/cardapio/${productId}`)
}

export async function deleteProduct(productId: string) {
  const { supabase, store } = await getCurrentStore()
  await supabase.from('products').delete().eq('id', productId).eq('store_id', store.id)
  revalidatePath('/dashboard/cardapio')
  redirect('/dashboard/cardapio')
}

// ===== Complementos / variações =====

export async function createOptionGroup(productId: string, formData: FormData) {
  const { supabase, store } = await getCurrentStore()
  const name = String(formData.get('name') || '').trim()
  if (!name) return
  await supabase.from('product_option_groups').insert({
    store_id: store.id,
    product_id: productId,
    name,
    required: formData.get('required') === 'on',
    min_select: Number(formData.get('minSelect') || 0),
    max_select: Number(formData.get('maxSelect') || 1),
  })
  revalidatePath(`/dashboard/cardapio/${productId}`)
}

export async function deleteOptionGroup(productId: string, groupId: string) {
  const { supabase, store } = await getCurrentStore()
  await supabase.from('product_option_groups').delete().eq('id', groupId).eq('store_id', store.id)
  revalidatePath(`/dashboard/cardapio/${productId}`)
}

export async function createOption(productId: string, groupId: string, formData: FormData) {
  const { supabase, store } = await getCurrentStore()
  const name = String(formData.get('name') || '').trim()
  if (!name) return
  await supabase.from('product_options').insert({
    store_id: store.id,
    group_id: groupId,
    name,
    price_delta_cents: Math.round(Number(formData.get('price') || 0) * 100),
  })
  revalidatePath(`/dashboard/cardapio/${productId}`)
}

// Adiciona várias opções de uma vez: uma por linha, no formato "Nome" ou "Nome | 2,50"
export async function createOptions(productId: string, groupId: string, formData: FormData) {
  const { supabase, store } = await getCurrentStore()
  const raw = String(formData.get('bulk') || '')

  const inserts = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      const sep = line.indexOf('|')
      const name = (sep === -1 ? line : line.slice(0, sep)).trim()
      const priceStr = sep === -1 ? '' : line.slice(sep + 1).trim().replace(/r\$/i, '').replace(',', '.')
      const price = Number(priceStr) || 0
      return {
        store_id: store.id,
        group_id: groupId,
        name,
        price_delta_cents: Math.max(0, Math.round(price * 100)),
        sort_order: i,
      }
    })
    .filter((r) => r.name)

  if (!inserts.length) return
  await supabase.from('product_options').insert(inserts)
  revalidatePath(`/dashboard/cardapio/${productId}`)
}

export async function setOptionImage(productId: string, optionId: string, imageUrl: string | null) {
  const { supabase, store } = await getCurrentStore()
  await supabase
    .from('product_options')
    .update({ image_url: imageUrl || null })
    .eq('id', optionId)
    .eq('store_id', store.id)
  revalidatePath(`/dashboard/cardapio/${productId}`)
}

export async function setOptionDescription(productId: string, optionId: string, description: string) {
  const { supabase, store } = await getCurrentStore()
  await supabase
    .from('product_options')
    .update({ description: description.trim() || null })
    .eq('id', optionId)
    .eq('store_id', store.id)
  revalidatePath(`/dashboard/cardapio/${productId}`)
}

export async function toggleOption(productId: string, optionId: string, isActive: boolean) {
  const { supabase, store } = await getCurrentStore()
  await supabase.from('product_options').update({ is_active: isActive }).eq('id', optionId).eq('store_id', store.id)
  revalidatePath(`/dashboard/cardapio/${productId}`)
}

export async function deleteOption(productId: string, optionId: string) {
  const { supabase, store } = await getCurrentStore()
  await supabase.from('product_options').delete().eq('id', optionId).eq('store_id', store.id)
  revalidatePath(`/dashboard/cardapio/${productId}`)
}
