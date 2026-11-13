import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

/**
 * Quem entra no /admin (área interna do time).
 *
 * Dois níveis, de propósito:
 *
 * - DONO: e-mail listado na env ADMIN_EMAILS (ou o fallback abaixo). Só muda com
 *   deploy, então ninguém consegue se trancar do lado de fora nem tirar o dono
 *   pelo painel. É quem pode mexer na equipe.
 * - CONVIDADO: linha na tabela platform_admins, adicionada em /admin/equipe. Vê e
 *   opera tudo no painel (leads, lojas, faturas) igual ao dono, mas não mexe na
 *   própria lista de admins.
 */

const FALLBACK_ADMINS = ['thiagoribeiro18181@gmail.com']

/**
 * Separa a lista da env em e-mails. Aceita vírgula, ponto e vírgula ou espaço,
 * e descasca aspas: `ADMIN_EMAILS="fulano@x.com"` colado no painel da Vercel
 * chega aqui COM as aspas, e a comparação falhava calada — foi assim que o
 * painel de produção virou um loop de login.
 */
function parseEmailList(raw) {
  return (raw || '')
    .split(/[,;\s]+/)
    .map((e) => e.trim().replace(/^["']+|["']+$/g, '').trim().toLowerCase())
    .filter((e) => e.includes('@'))
}

/**
 * E-mails de dono — fixos no deploy, imexíveis pelo painel.
 *
 * A env SOMA com o fallback em vez de substituir: valor errado, com aspas ou
 * ausente na Vercel não pode trancar o dono do lado de fora do próprio painel.
 * Pra tirar o endereço do fallback é preciso editar este arquivo, de propósito.
 */
export function getOwnerEmails() {
  return [...new Set([...parseEmailList(process.env.ADMIN_EMAILS), ...FALLBACK_ADMINS])]
}

export function isOwnerEmail(email) {
  if (!email) return false
  return getOwnerEmails().includes(email.toLowerCase())
}

/**
 * Admins convidados pelo painel. `cache` do React segura o resultado durante a
 * mesma request — a layout, a página e cada server action chamam requireAdmin(),
 * e sem isso seria uma consulta por chamada.
 */
export const listTeamAdmins = cache(async () => {
  try {
    const { data, error } = await createAdminClient()
      .from('platform_admins')
      .select('id, email, name, user_id, invited_by, created_at')
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  } catch {
    // Banco fora do ar ou service_role ausente: o dono continua entrando pela env.
    return []
  }
})

export async function isAdminEmail(email) {
  if (!email) return false
  const clean = email.toLowerCase()
  if (getOwnerEmails().includes(clean)) return true
  const team = await listTeamAdmins()
  return team.some((a) => a.email === clean)
}

// Garante que quem acessa a rota é admin. Redireciona pro login se não for.
export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !(await isAdminEmail(user.email))) {
    redirect('/login')
  }

  return { user, isOwner: isOwnerEmail(user.email) }
}
