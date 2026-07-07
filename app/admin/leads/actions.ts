'use server'

import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'

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
}

// Busca a lista de leads (usada no carregamento inicial e no polling ao vivo do painel).
export async function fetchLeads(): Promise<LeadRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)
  return (data || []) as LeadRow[]
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
