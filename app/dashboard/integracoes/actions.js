'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentStore } from '@/lib/store'

// Focus NFe: por enquanto só guarda os dados da loja e marca a ativação como
// solicitada. A chamada à API (token da plataforma + certificado A1 da loja)
// entra quando a integração for ligada de verdade — ver docs/estoque.md.
export async function requestFocusNfe(input) {
  const { supabase, store } = await getCurrentStore()
  const cnpj = String(input?.cnpj ?? '').replace(/\D/g, '')
  const environment = input?.environment === 'producao' ? 'producao' : 'homologacao'
  if (cnpj.length !== 14) return { ok: false, error: 'Informe o CNPJ da loja (14 dígitos).' }

  const { error } = await supabase.from('store_integrations').upsert(
    {
      store_id: store.id,
      provider: 'focus_nfe',
      status: 'pending',
      settings: { cnpj, environment, requested_at: new Date().toISOString() },
    },
    { onConflict: 'store_id,provider' }
  )
  if (error) return { ok: false, error: 'Não foi possível salvar. Tente de novo.' }
  revalidatePath('/dashboard/integracoes')
  return { ok: true }
}

export async function cancelFocusNfe() {
  const { supabase, store } = await getCurrentStore()
  const { error } = await supabase
    .from('store_integrations')
    .update({ status: 'disconnected' })
    .eq('store_id', store.id)
    .eq('provider', 'focus_nfe')
  if (error) return { ok: false, error: 'Não foi possível cancelar.' }
  revalidatePath('/dashboard/integracoes')
  return { ok: true }
}
