'use server'

import { randomBytes } from 'crypto'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/slug'

const STATUSES = ['novo', 'contatado', 'fechado', 'perdido'] as const
type Status = (typeof STATUSES)[number]

export type LeadRow = {
  id: string
  name: string | null
  company: string | null
  email: string | null
  whatsapp: string | null
  monthly_revenue: string | null
  segment: string | null
  status: string
  notes: string | null
  created_at: string
  converted_at: string | null
  converted_user_id: string | null
  converted_store_id: string | null
  store_slug?: string | null
}

// Busca a lista de leads (usada no carregamento inicial e no polling ao vivo do painel).
export async function fetchLeads(): Promise<LeadRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('leads')
    .select('*, store:converted_store_id(slug)')
    .order('created_at', { ascending: false })
    .limit(500)

  return (data || []).map((row) => {
    const { store, ...lead } = row as LeadRow & { store: { slug: string } | null }
    return { ...lead, store_slug: store?.slug ?? null }
  })
}

export async function setLeadStatus(id: string, status: string): Promise<{ ok: boolean }> {
  await requireAdmin()
  if (!id || !STATUSES.includes(status as Status)) return { ok: false }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  return { ok: !error }
}

export async function setLeadNotes(id: string, notes: string): Promise<{ ok: boolean }> {
  await requireAdmin()
  if (!id) return { ok: false }

  const supabase = createAdminClient()
  const clean = notes.trim()
  const { error } = await supabase
    .from('leads')
    .update({ notes: clean || null, updated_at: new Date().toISOString() })
    .eq('id', id)

  return { ok: !error }
}

// ── Aprovação de lead → cria conta + loja sem tocar no banco na mão ──────

export type ApproveResult =
  | { ok: true; email: string; password: string; slug: string; storeId?: string }
  | { ok: false; error: string }

// Senha temporária legível (o cliente troca depois no painel dele).
function tempPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = randomBytes(8)
  let out = ''
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return `Agil-${out}`
}

async function uniqueSlug(supabase: ReturnType<typeof createAdminClient>, base: string): Promise<string> {
  const baseSlug = slugify(base) || 'loja'
  let slug = baseSlug
  for (let attempt = 1; attempt <= 20; attempt++) {
    const { data: existing } = await supabase.from('stores').select('id').eq('slug', slug).maybeSingle()
    if (!existing) return slug
    slug = `${baseSlug}-${attempt}`
  }
  // Fallback: sufixo aleatório garante unicidade
  return `${baseSlug}-${randomBytes(3).toString('hex')}`
}

export async function approveLead(
  leadId: string,
  input: { storeName: string; email: string; whatsapp?: string }
): Promise<ApproveResult> {
  await requireAdmin()

  const storeName = input.storeName.trim()
  const email = input.email.trim().toLowerCase()
  const whatsapp = (input.whatsapp || '').trim()

  if (!leadId || !storeName) return { ok: false, error: 'Informe o nome da loja.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'E-mail inválido.' }

  const supabase = createAdminClient()

  const { data: lead } = await supabase.from('leads').select('id, converted_store_id').eq('id', leadId).maybeSingle()
  if (!lead) return { ok: false, error: 'Lead não encontrado.' }
  if (lead.converted_store_id) return { ok: false, error: 'Esse lead já tem conta criada.' }

  const password = tempPassword()

  const { data: created, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: storeName, source: 'lead_approval', lead_id: leadId },
  })

  if (userError || !created?.user) {
    const already =
      userError?.code === 'email_exists' || /already|registered|exists/i.test(userError?.message || '')
    return {
      ok: false,
      error: already
        ? 'Já existe uma conta com esse e-mail. Use outro e-mail ou verifique no painel do Supabase.'
        : 'Não foi possível criar o usuário: ' + (userError?.message || 'erro desconhecido'),
    }
  }

  const slug = await uniqueSlug(supabase, storeName)

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .insert({
      owner_id: created.user.id,
      slug,
      name: storeName,
      whatsapp_number: whatsapp || null,
    })
    .select('id, slug')
    .single()

  if (storeError || !store) {
    // Desfaz o usuário pra não deixar conta órfã sem loja
    await supabase.auth.admin.deleteUser(created.user.id).catch(() => {})
    return { ok: false, error: 'Erro ao criar a loja: ' + (storeError?.message || 'erro desconhecido') }
  }

  await supabase
    .from('leads')
    .update({
      status: 'fechado',
      converted_at: new Date().toISOString(),
      converted_user_id: created.user.id,
      converted_store_id: store.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  return { ok: true, email, password, slug: store.slug, storeId: store.id }
}

// Gera uma nova senha temporária pra um lead já convertido (cliente esqueceu / perdeu o acesso).
export async function resetLeadPassword(leadId: string): Promise<ApproveResult> {
  await requireAdmin()

  const supabase = createAdminClient()
  const { data: lead } = await supabase
    .from('leads')
    .select('email, converted_user_id, store:converted_store_id(slug)')
    .eq('id', leadId)
    .maybeSingle()

  const userId = lead?.converted_user_id
  if (!lead || !userId) return { ok: false, error: 'Esse lead ainda não tem conta criada.' }

  const password = tempPassword()
  const { data: updated, error } = await supabase.auth.admin.updateUserById(userId, { password })
  if (error) return { ok: false, error: 'Não foi possível gerar a nova senha: ' + error.message }

  const store = lead.store as unknown as { slug: string } | null
  return { ok: true, email: updated.user?.email || lead.email || '', password, slug: store?.slug || '' }
}
