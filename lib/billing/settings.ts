import { createAdminClient } from '@/lib/supabase/admin'

// Ajustes do ciclo de cobrança editáveis no /admin (tabela platform_settings),
// para não precisar de deploy toda vez que mudar a régua de aviso.

export type BillingSettings = {
  /** Dias antes do vencimento em que a fatura é emitida e o lojista é avisado. */
  emitDaysBefore: number
}

export const DEFAULT_BILLING_SETTINGS: BillingSettings = {
  emitDaysBefore: 7,
}

const KEY_EMIT_DAYS = 'billing_emit_days_before'

export async function getBillingSettings(): Promise<BillingSettings> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('platform_settings')
    .select('value')
    .eq('key', KEY_EMIT_DAYS)
    .maybeSingle<{ value: string | null }>()

  const parsed = Number(data?.value)
  return {
    emitDaysBefore:
      Number.isInteger(parsed) && parsed >= 0 && parsed <= 28 ? parsed : DEFAULT_BILLING_SETTINGS.emitDaysBefore,
  }
}

export async function setEmitDaysBefore(days: number): Promise<{ ok: boolean; error?: string }> {
  if (!Number.isInteger(days) || days < 0 || days > 28) {
    return { ok: false, error: 'Use um número de 0 a 28 dias.' }
  }
  const admin = createAdminClient()
  await admin
    .from('platform_settings')
    .upsert({ key: KEY_EMIT_DAYS, value: String(days) }, { onConflict: 'key' })
  return { ok: true }
}
