'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { markInvoicePaid, type PlanInvoice } from '@/lib/billing/invoices'
import { setPixPayloadForPlan, readPixAmountCents } from '@/lib/billing/pix'
import { setEmitDaysBefore } from '@/lib/billing/settings'

/**
 * Baixa manual: o lojista pagou por fora (dinheiro, transferência, acordo).
 * Passa pelo MESMO caminho do webhook — libera o mês e empurra o vencimento —
 * para não existirem dois jeitos diferentes de dar uma fatura como paga.
 */
export async function markInvoicePaidManually(invoiceId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  if (!invoiceId) return { ok: false, error: 'Fatura inválida.' }

  const admin = createAdminClient()
  const { data: invoice } = await admin
    .from('plan_invoices')
    .select('*')
    .eq('id', invoiceId)
    .maybeSingle<PlanInvoice>()

  if (!invoice) return { ok: false, error: 'Fatura não encontrada.' }
  if (invoice.status === 'paid') return { ok: true }

  await markInvoicePaid(invoice)
  revalidatePath('/admin/faturas')
  revalidatePath('/admin/lojas')
  return { ok: true }
}

/**
 * Recusa um pagamento declarado que não apareceu no extrato: a fatura volta
 * a ficar devendo e o relógio da suspensão volta a correr.
 */
export async function rejectPaymentClaim(invoiceId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  if (!invoiceId) return { ok: false, error: 'Fatura inválida.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('plan_invoices')
    .update({ status: 'overdue', payment_claimed_at: null })
    .eq('id', invoiceId)
    .eq('status', 'awaiting_confirmation')

  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/faturas')
  return { ok: true }
}

/** Cadastra o payload Pix copia-e-cola de um plano (QR estático do banco). */
export async function savePixPayload(plan: 'free' | 'pro', payload: string): Promise<{ ok: boolean; error?: string; amountCents?: number | null }> {
  await requireAdmin()

  const clean = payload.trim()
  if (clean && !clean.toLowerCase().includes('br.gov.bcb.pix')) {
    return { ok: false, error: 'Isso não parece um código Pix copia e cola.' }
  }

  await setPixPayloadForPlan(plan, clean)
  revalidatePath('/admin/faturas')
  return { ok: true, amountCents: clean ? readPixAmountCents(clean) : null }
}

/** Quantos dias antes do vencimento a fatura é emitida e o lojista avisado. */
export async function saveEmitDaysBefore(days: number): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  const res = await setEmitDaysBefore(days)
  if (res.ok) revalidatePath('/admin/faturas')
  return res
}

/** Cancela uma fatura (cortesia, erro de emissão, loja que saiu). */
export async function cancelInvoice(invoiceId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  if (!invoiceId) return { ok: false, error: 'Fatura inválida.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('plan_invoices')
    .update({ status: 'canceled' })
    .eq('id', invoiceId)
    .neq('status', 'paid')

  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/faturas')
  return { ok: true }
}
