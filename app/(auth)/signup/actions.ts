'use server'

import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/slug'
import { redirect } from 'next/navigation'

export async function signup(formData: FormData) {
  const email = String(formData.get('email') || '')
  const password = String(formData.get('password') || '')
  const storeName = String(formData.get('storeName') || '')
  const whatsapp = String(formData.get('whatsapp') || '')

  if (!email || !password || !storeName) {
    return { error: 'Preencha todos os campos.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) {
    return { error: error.message }
  }
  if (!data.session) {
    return {
      error: null,
      message: 'Conta criada! Confirme seu e-mail para continuar e depois faça login.',
    }
  }

  const baseSlug = slugify(storeName) || 'loja'
  let slug = baseSlug
  let attempt = 0
  while (attempt < 5) {
    const { data: existing } = await supabase
      .from('stores')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!existing) break
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  const { error: storeError } = await supabase.from('stores').insert({
    owner_id: data.user!.id,
    slug,
    name: storeName,
    whatsapp_number: whatsapp || null,
  })

  if (storeError) {
    return { error: 'Conta criada, mas houve um erro ao criar a loja: ' + storeError.message }
  }

  redirect('/dashboard/pedidos')
}
