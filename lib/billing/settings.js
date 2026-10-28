import { createAdminClient } from '@/lib/supabase/admin'

// Ajustes do ciclo de cobrança editáveis no /admin (tabela platform_settings),
// para não precisar de deploy toda vez que mudar a régua de aviso.


export const DEFAULT_BILLING_SETTINGS = {
  emitDaysBefore: 7,
}

const KEY_EMIT_DAYS = 'billing_emit_days_before'

export async function getBillingSettings() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('platform_settings')
    .select('value')
    .eq('key', KEY_EMIT_DAYS)
    .maybeSingle()

  const parsed = Number(data?.value)
  return {
    emitDaysBefore:
      Number.isInteger(parsed) && parsed >= 0 && parsed <= 28 ? parsed : DEFAULT_BILLING_SETTINGS.emitDaysBefore,
  }
}

export async function setEmitDaysBefore(days) {
  if (!Number.isInteger(days) || days < 0 || days > 28) {
    return { ok: false, error: 'Use um número de 0 a 28 dias.' }
  }
  const admin = createAdminClient()
  await admin
    .from('platform_settings')
    .upsert({ key: KEY_EMIT_DAYS, value: String(days) }, { onConflict: 'key' })
  return { ok: true }
}
