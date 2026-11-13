'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { requireAdmin, isOwnerEmail } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Senha temporária legível — a pessoa troca depois pelo "esqueci minha senha". */
function tempPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let out = ''
  for (const b of randomBytes(8)) out += alphabet[b % alphabet.length]
  return `Hub-${out}`
}

/**
 * Mexer na equipe é só do dono (env ADMIN_EMAILS). Um convidado opera o painel
 * inteiro, mas não convida mais gente nem remove quem já está — senão o controle
 * de quem entra sairia das mãos de quem paga a conta.
 */
async function ownerOnly() {
  const { user, isOwner } = await requireAdmin()
  if (!isOwner) return { error: 'Só o dono do painel pode mexer na equipe.' }
  return { user }
}

/** O admin API não busca por e-mail; com time pequeno, varrer as páginas resolve. */
async function findUserByEmail(supabase, email) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) return null
    const hit = (data?.users || []).find((u) => (u.email || '').toLowerCase() === email)
    if (hit) return hit
    if ((data?.users || []).length < 200) return null
  }
  return null
}

/** Lista a equipe atual (usada no refresh depois de cada mudança). */
export async function fetchTeam() {
  await requireAdmin()
  const { data } = await createAdminClient()
    .from('platform_admins')
    .select('id, email, name, invited_by, created_at')
    .order('created_at', { ascending: true })
  return data || []
}

/**
 * Libera o painel pra um e-mail. Se a pessoa ainda não tem conta, cria uma já
 * confirmada com senha temporária e devolve as credenciais pra você passar
 * adiante — a senha aparece uma vez só.
 */
export async function addAdmin(input) {
  const gate = await ownerOnly()
  if (gate.error) return { ok: false, error: gate.error }

  const email = String(input?.email || '').trim().toLowerCase()
  const name = String(input?.name || '').trim()

  if (!EMAIL_RE.test(email)) return { ok: false, error: 'E-mail inválido.' }
  if (isOwnerEmail(email)) return { ok: false, error: 'Esse e-mail já é dono do painel.' }

  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('platform_admins')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (existing) return { ok: false, error: 'Esse e-mail já está na equipe.' }

  // Conta nova: senha temporária. Conta que já existe (lojista virando admin,
  // alguém que já se cadastrou): mantém a senha dela, só ganha o acesso.
  const password = tempPassword()
  const { data: created, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: name || null, source: 'admin_team' },
  })

  const already =
    !!userError &&
    (userError.code === 'email_exists' || /already|registered|exists/i.test(userError.message || ''))

  if (userError && !already) {
    return { ok: false, error: 'Não foi possível criar a conta: ' + userError.message }
  }

  const userId = created?.user?.id || (already ? (await findUserByEmail(supabase, email))?.id : null)

  const { data: row, error: insertError } = await supabase
    .from('platform_admins')
    .insert({ email, name: name || null, user_id: userId || null, invited_by: gate.user.email })
    .select('id, email, name, invited_by, created_at')
    .single()

  if (insertError || !row) {
    // Desfaz a conta recém-criada pra não deixar usuário órfão sem acesso nenhum.
    if (created?.user?.id) await supabase.auth.admin.deleteUser(created.user.id).catch(() => {})
    return { ok: false, error: 'Erro ao salvar: ' + (insertError?.message || 'erro desconhecido') }
  }

  revalidatePath('/admin/equipe')
  return { ok: true, admin: row, password: already ? null : password, alreadyHadAccount: already }
}

/**
 * Tira o acesso ao painel. A conta de login continua existindo (a pessoa pode
 * ser lojista também) — some só a permissão de admin.
 */
export async function removeAdmin(id) {
  const gate = await ownerOnly()
  if (gate.error) return { ok: false, error: gate.error }
  if (!id) return { ok: false, error: 'Admin inválido.' }

  const { error } = await createAdminClient().from('platform_admins').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/equipe')
  return { ok: true }
}

/** Nova senha temporária pra um admin da equipe (esqueceu / perdeu o acesso). */
export async function resetAdminPassword(id) {
  const gate = await ownerOnly()
  if (gate.error) return { ok: false, error: gate.error }

  const supabase = createAdminClient()
  const { data: row } = await supabase
    .from('platform_admins')
    .select('id, email, name, user_id')
    .eq('id', id)
    .maybeSingle()
  if (!row) return { ok: false, error: 'Admin não encontrado.' }

  const password = tempPassword()
  const userId = row.user_id || (await findUserByEmail(supabase, row.email))?.id

  if (!userId) {
    // Ainda sem conta de login (o cadastro falhou lá atrás): cria agora.
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: row.email,
      password,
      email_confirm: true,
      user_metadata: { name: row.name || null, source: 'admin_team' },
    })
    if (error || !created?.user) {
      return { ok: false, error: 'Não foi possível criar a conta: ' + (error?.message || 'erro desconhecido') }
    }
    await supabase.from('platform_admins').update({ user_id: created.user.id }).eq('id', row.id)
    return { ok: true, email: row.email, password }
  }

  const { error } = await supabase.auth.admin.updateUserById(userId, { password })
  if (error) return { ok: false, error: 'Não foi possível gerar a senha: ' + error.message }
  if (!row.user_id) await supabase.from('platform_admins').update({ user_id: userId }).eq('id', row.id)

  return { ok: true, email: row.email, password }
}
