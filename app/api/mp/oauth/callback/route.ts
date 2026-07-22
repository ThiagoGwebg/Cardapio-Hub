import { NextRequest, NextResponse } from 'next/server'
import { getBaseUrl } from '@/lib/baseUrl'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeOAuthCode, verifyState } from '@/lib/mercadopago/client'

export const runtime = 'nodejs'

// Retorno do OAuth do Mercado Pago: troca o code pelo token do lojista e conecta a conta.
export async function GET(request: NextRequest) {
  const base = getBaseUrl()
  const back = new URL('/dashboard/loja', base)

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state) {
    back.searchParams.set('mp', 'error')
    return NextResponse.redirect(back)
  }

  const verified = verifyState(state)
  if (!verified) {
    back.searchParams.set('mp', 'error')
    return NextResponse.redirect(back)
  }

  try {
    const token = await exchangeOAuthCode(code)
    const admin = createAdminClient()

    await admin.from('store_payment_credentials').upsert(
      {
        store_id: verified.storeId,
        provider: 'mercadopago',
        mp_user_id: String(token.user_id),
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        token_expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
        public_key: token.public_key,
      },
      { onConflict: 'store_id' }
    )

    await admin.from('stores').update({ mp_connected: true }).eq('id', verified.storeId)

    back.searchParams.set('mp', 'connected')
    return NextResponse.redirect(back)
  } catch {
    back.searchParams.set('mp', 'error')
    return NextResponse.redirect(back)
  }
}
