'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'

// Troca manual de plano (venda assistida / cortesia). Atenção: se a loja tiver
// assinatura real no Stripe, o webhook pode sobrescrever isso no próximo evento.
export async function setStorePlan(storeId: string, plan: 'free' | 'pro'): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  if (!storeId || !['free', 'pro'].includes(plan)) return { ok: false, error: 'Dados inválidos.' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('subscriptions')
    .update({ plan, status: 'active', updated_at: new Date().toISOString() })
    .eq('store_id', storeId)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/lojas')
  return { ok: true }
}

/**
 * Liga/ajusta a cobrança da mensalidade de uma loja.
 * Ligar exige um vencimento: sem ele o ciclo não teria de onde emitir a fatura.
 */
export async function setStoreBilling(
  storeId: string,
  input: { enabled: boolean; priceCents?: number; nextDueDate?: string; graceDays?: number }
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  if (!storeId) return { ok: false, error: 'Dados inválidos.' }
  if (input.enabled && !input.nextDueDate) {
    return { ok: false, error: 'Informe a data do próximo vencimento.' }
  }
  if (input.priceCents !== undefined && (!Number.isInteger(input.priceCents) || input.priceCents < 0)) {
    return { ok: false, error: 'Valor inválido.' }
  }

  const patch: Record<string, unknown> = {
    billing_enabled: input.enabled,
    updated_at: new Date().toISOString(),
  }
  if (input.priceCents !== undefined) patch.price_cents = input.priceCents
  if (input.nextDueDate) patch.next_due_date = input.nextDueDate
  if (input.graceDays !== undefined) patch.grace_days = input.graceDays

  const supabase = createAdminClient()
  const { error } = await supabase.from('subscriptions').update(patch).eq('store_id', storeId)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/lojas')
  return { ok: true }
}

/**
 * Religa uma loja suspensa sem exigir o Pix (perdão de dívida / acordo por fora).
 * Cancela as faturas vencidas para o ciclo não suspender de novo no dia seguinte.
 */
export async function reactivateStore(storeId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  if (!storeId) return { ok: false, error: 'Dados inválidos.' }

  const supabase = createAdminClient()

  const { error: invErr } = await supabase
    .from('plan_invoices')
    .update({ status: 'canceled' })
    .eq('store_id', storeId)
    .in('status', ['open', 'overdue'])
  if (invErr) return { ok: false, error: invErr.message }

  const { error } = await supabase
    .from('subscriptions')
    .update({ billing_status: 'current', suspended_at: null, updated_at: new Date().toISOString() })
    .eq('store_id', storeId)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/lojas')
  return { ok: true }
}
