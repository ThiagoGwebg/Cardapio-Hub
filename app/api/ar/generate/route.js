import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStorePlan } from '@/lib/plan'
import { arEnabled, getArUsage, AR_VIEWS } from '@/lib/ar/config'
import { createMultiviewTask } from '@/lib/ar/tripo'

export const runtime = 'nodejs'

/**
 * Dispara a geração do modelo 3D de um produto a partir das fotos de vista.
 *
 * Todos os gates ficam AQUI, no servidor (não confiar na UI): dono da loja,
 * plano Pro ativo, cota do mês, produto da própria loja e frente obrigatória.
 * As fotos já foram enviadas antes via /api/upload (kind 'ar') e chegam como
 * URLs públicas do nosso Storage — a Tripo baixa direto de lá.
 */
export async function POST(req) {
  if (!arEnabled()) {
    return NextResponse.json({ error: 'Realidade aumentada indisponível no momento.' }, { status: 503 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Faça login.' }, { status: 401 })

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!store) return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 403 })

  const plan = await getStorePlan(supabase, store.id)
  if (plan !== 'pro') {
    return NextResponse.json({ error: 'A realidade aumentada é exclusiva do plano Pro.' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const productId = String(body?.productId || '')
  const sizeCm = Number(body?.sizeCm)
  const photos = body?.photos && typeof body.photos === 'object' ? body.photos : {}

  if (!productId) return NextResponse.json({ error: 'Produto ausente.' }, { status: 400 })
  if (!Number.isFinite(sizeCm) || sizeCm < 3 || sizeCm > 120) {
    return NextResponse.json({ error: 'Informe a largura real do prato, entre 3 e 120 cm.' }, { status: 400 })
  }

  // Só aceita URLs do nosso próprio Storage: evita apontar a Tripo para uma
  // URL arbitrária em nome da plataforma.
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/store-assets/${store.id}/`
  const views = {}
  for (const view of AR_VIEWS) {
    const url = photos[view]
    if (!url) continue
    if (typeof url !== 'string' || !url.startsWith(base)) {
      return NextResponse.json({ error: 'Foto inválida — envie pelo próprio painel.' }, { status: 400 })
    }
    views[view] = url
  }
  if (!views.front) {
    return NextResponse.json({ error: 'A foto de frente é obrigatória.' }, { status: 400 })
  }
  if (Object.keys(views).length < 2) {
    return NextResponse.json({ error: 'Envie pelo menos 2 fotos (frente + um lado).' }, { status: 400 })
  }

  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('store_id', store.id)
    .maybeSingle()
  if (!product) return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 })

  // Uma geração por vez por produto: a anterior em andamento precisa terminar.
  const { data: inFlight } = await supabase
    .from('ar_generations')
    .select('id')
    .eq('product_id', productId)
    .eq('status', 'processing')
    .limit(1)
  if (inFlight && inFlight.length > 0) {
    return NextResponse.json({ error: 'Já existe uma geração em andamento para este produto.' }, { status: 409 })
  }

  const usage = await getArUsage(supabase, store.id)
  if (usage.used >= usage.limit) {
    return NextResponse.json(
      { error: `Você usou as ${usage.limit} gerações de 3D deste mês. A cota renova no dia 1º.` },
      { status: 429 }
    )
  }

  let taskId
  try {
    taskId = await createMultiviewTask(views)
  } catch (e) {
    console.error('[ar] criar task', e)
    return NextResponse.json({ error: 'Não deu pra iniciar a geração agora. Tente de novo.' }, { status: 502 })
  }

  const { data: gen, error: insErr } = await supabase
    .from('ar_generations')
    .insert({
      store_id: store.id,
      product_id: productId,
      task_id: taskId,
      status: 'processing',
      size_cm: sizeCm,
      source_photos: views,
    })
    .select('id')
    .single()

  if (insErr || !gen) {
    console.error('[ar] insert generation', insErr)
    return NextResponse.json({ error: 'Falha ao registrar a geração.' }, { status: 500 })
  }

  return NextResponse.json({ id: gen.id, status: 'processing', used: usage.used + 1, limit: usage.limit })
}
