'use server'

import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  // trim() evita falha por espaço/quebra de linha que vem junto ao copiar credenciais
  const email = String(formData.get('email') || '').trim()
  const password = String(formData.get('password') || '').trim()

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'E-mail ou senha inválidos.' }
  }

  // Admin do SaaS cai direto no painel interno; lojista vai pro dashboard da loja
  if (isAdminEmail(email)) {
    redirect('/admin')
  }
  redirect('/dashboard')
}
