import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Cliente com service_role — só usar em rotas server-side de confiança (ex: webhook do Stripe).
// Bypassa RLS, nunca expor ao cliente.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
