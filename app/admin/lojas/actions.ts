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
