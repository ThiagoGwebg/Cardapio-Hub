import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Salva a inscrição de push do dispositivo do lojista (uma por endpoint/aparelho).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: store } = await supabase.from('stores').select('id').eq('owner_id', user.id).maybeSingle()
  if (!store) return NextResponse.json({ error: 'no store' }, { status: 403 })

  const sub = await req.json().catch(() => null)
  if (!sub?.endpoint) return NextResponse.json({ error: 'invalid subscription' }, { status: 400 })

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ store_id: store.id, endpoint: sub.endpoint, subscription: sub }, { onConflict: 'endpoint' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
