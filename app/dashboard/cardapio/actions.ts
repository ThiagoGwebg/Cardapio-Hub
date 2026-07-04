'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStore } from '@/lib/store'
import { revalidatePath } from 'next/cache'

export async function toggleProduct(productId: string, isActive: boolean) {
  const supabase = await createClient()
  await supabase.from('products').update({ is_active: isActive }).eq('id', productId)
  revalidatePath('/dashboard/cardapio')
}

export async function createProduct(formData: FormData) {
  const { supabase, store } = await getCurrentStore()

  const name = String(formData.get('name') || '')
  const priceReais = Number(formData.get('price') || 0)
  const description = String(formData.get('description') || '')
  const imageUrl = String(formData.get('imageUrl') || '')
  const categoryName = String(formData.get('category') || 'Geral')

  if (!name || !priceReais) return

  let { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('store_id', store.id)
    .eq('name', categoryName)
    .maybeSingle()

  if (!category) {
    const { data: newCategory } = await supabase
      .from('categories')
      .insert({ store_id: store.id, name: categoryName })
      .select('id')
      .single()
    category = newCategory
  }

  await supabase.from('products').insert({
    store_id: store.id,
    category_id: category?.id,
    name,
    description,
    price_cents: Math.round(priceReais * 100),
    image_url: imageUrl || null,
  })

  revalidatePath('/dashboard/cardapio')
}
