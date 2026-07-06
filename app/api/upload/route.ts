import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
}
const KINDS = new Set(['logo', 'banner', 'product'])
const MAX_BYTES = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Faça login para enviar imagens.' }, { status: 401 })
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!store) {
    return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get('file')
  const kind = String(form.get('kind') || '')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo ausente.' }, { status: 400 })
  }
  if (!KINDS.has(kind)) {
    return NextResponse.json({ error: 'Tipo de upload inválido.' }, { status: 400 })
  }
  const ext = EXT[file.type]
  if (!ext) {
    return NextResponse.json(
      { error: 'Use uma imagem PNG, JPG, WEBP, GIF ou SVG.' },
      { status: 415 }
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'A imagem deve ter até 5 MB.' }, { status: 413 })
  }

  const path = `${store.id}/${kind}-${Date.now()}.${ext}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  // Upload com service_role: a autorização já foi feita acima (usuário logado
  // dono da loja) e o caminho é forçado para a pasta da própria loja.
  const admin = createAdminClient()
  const { error: upErr } = await admin.storage
    .from('store-assets')
    .upload(path, bytes, { contentType: file.type, upsert: true, cacheControl: '3600' })

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  const { data } = admin.storage.from('store-assets').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
