import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Lista de e-mails com acesso ao /admin (área interna do time de vendas).
// Configure via env ADMIN_EMAILS (separados por vírgula). O e-mail abaixo é o fallback inicial.
const FALLBACK_ADMINS = ['thiagoribeiro18181@gmail.com']

export function getAdminEmails(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  const all = fromEnv.length ? fromEnv : FALLBACK_ADMINS
  return all.map((e) => e.toLowerCase())
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return getAdminEmails().includes(email.toLowerCase())
}

// Garante que quem acessa a rota é admin. Redireciona pro login se não for.
export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    redirect('/login')
  }

  return { user }
}
