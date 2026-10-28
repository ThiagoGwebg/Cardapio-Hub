import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/baseUrl'
import { buildAuthorizationUrl, signState } from '@/lib/mercadopago/client'

export const runtime = 'nodejs'

// Inicia a conexão do lojista com o Mercado Pago (OAuth marketplace).
export async function GET() {
  const base = getBaseUrl()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', base))

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!store) return NextResponse.redirect(new URL('/signup', base))

  try {
    return NextResponse.redirect(buildAuthorizationUrl(signState(store.id)))
  } catch {
    const back = new URL('/dashboard/loja', base)
    back.searchParams.set('mp', 'config_error')
    return NextResponse.redirect(back)
  }
}
