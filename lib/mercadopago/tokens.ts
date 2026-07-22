import { createAdminClient } from '@/lib/supabase/admin'
import { refreshOAuthToken } from '@/lib/mercadopago/client'

export type SellerCredential = {
  store_id: string
  mp_user_id: string | null
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  public_key: string | null
}

// Retorna um access token válido do lojista, renovando via refresh_token se estiver perto de expirar.
// Só roda em rotas server-side de confiança (usa o admin client, que ignora RLS).
export async function getFreshSellerToken(
  storeId: string
): Promise<{ accessToken: string; mpUserId: string | null } | null> {
  const admin = createAdminClient()
  const { data: cred } = await admin
    .from('store_payment_credentials')
    .select('store_id, mp_user_id, access_token, refresh_token, token_expires_at, public_key')
    .eq('store_id', storeId)
    .maybeSingle<SellerCredential>()

  if (!cred?.access_token) return null

  const expiresAt = cred.token_expires_at ? new Date(cred.token_expires_at).getTime() : 0
  const needsRefresh = !expiresAt || expiresAt - Date.now() < 5 * 60 * 1000 // margem de 5 min

  if (needsRefresh && cred.refresh_token) {
    try {
      const t = await refreshOAuthToken(cred.refresh_token)
      const newExpiry = new Date(Date.now() + t.expires_in * 1000).toISOString()
      await admin
        .from('store_payment_credentials')
        .update({
          access_token: t.access_token,
          refresh_token: t.refresh_token,
          token_expires_at: newExpiry,
          public_key: t.public_key,
          mp_user_id: String(t.user_id),
        })
        .eq('store_id', storeId)
      return { accessToken: t.access_token, mpUserId: String(t.user_id) }
    } catch {
      // Se o refresh falhar mas ainda houver token, tenta usar o atual.
      return { accessToken: cred.access_token, mpUserId: cred.mp_user_id }
    }
  }

  return { accessToken: cred.access_token, mpUserId: cred.mp_user_id }
}
