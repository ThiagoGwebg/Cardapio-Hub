import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTask, isFinalStatus, friendlyTaskError } from '@/lib/ar/tripo'
import { downloadModel, prepareGlb } from '@/lib/ar/glb'

export const runtime = 'nodejs'
// Baixar e reprocessar o .glb leva tempo (arquivo de dezenas de MB + texturas).
export const maxDuration = 60

/**
 * Consulta uma geração. Enquanto a Tripo trabalha, devolve o progresso; no
 * sucesso, ESTA rota faz o fechamento: baixa o .glb (a URL da Tripo expira em
 * ~5 min, então tem que ser no mesmo request), escala pro tamanho real,
 * comprime e grava no nosso Storage. A UI do painel fica em polling aqui.
 */
export async function GET(req) {
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

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Geração ausente.' }, { status: 400 })

  const { data: gen } = await supabase
    .from('ar_generations')
    .select('*')
    .eq('id', id)
    .eq('store_id', store.id)
    .maybeSingle()
  if (!gen) return NextResponse.json({ error: 'Geração não encontrada.' }, { status: 404 })

  if (gen.status !== 'processing') return NextResponse.json(summary(gen))

  let task
  try {
    task = await getTask(gen.task_id)
  } catch (e) {
    console.error('[ar] consultar task', e)
    // Erro de rede com a Tripo não é falha da geração — a UI tenta de novo.
    return NextResponse.json({ ...summary(gen), progress: null })
  }

  if (!isFinalStatus(task.status)) {
    return NextResponse.json({ ...summary(gen), progress: task.progress ?? 0 })
  }

  if (task.status !== 'success') {
    const error = friendlyTaskError(task.status)
    await supabase
      .from('ar_generations')
      .update({ status: 'failed', error, updated_at: new Date().toISOString() })
      .eq('id', gen.id)
    return NextResponse.json(summary({ ...gen, status: 'failed', error }))
  }

  // Sucesso: fechar agora, dentro da janela de 5 min da URL temporária.
  try {
    const modelUrl = task.output?.pbr_model || task.output?.model
    if (!modelUrl) throw new Error('task sem URL de modelo')

    const raw = await downloadModel(modelUrl)
    const { glb, widthCm, heightCm } = await prepareGlb(raw, Number(gen.size_cm))

    // service_role para gravar: a autorização (dono da loja) já foi feita acima
    // e o caminho é forçado para a pasta da própria loja — igual ao /api/upload.
    const admin = createAdminClient()
    const path = `${store.id}/ar/${gen.product_id}-${gen.id}.glb`
    const { error: upErr } = await admin.storage
      .from('store-assets')
      .upload(path, glb, {
        contentType: 'model/gltf-binary',
        upsert: true,
        cacheControl: '31536000',
      })
    if (upErr) throw upErr

    const { data: pub } = admin.storage.from('store-assets').getPublicUrl(path)

    // preview_url da Tripo expira junto com a task — não serve pra guardar.
    // O painel mostra o preview com o próprio .glb no model-viewer.
    const update = {
      status: 'ready',
      model_url: pub.publicUrl,
      updated_at: new Date().toISOString(),
    }
    await supabase.from('ar_generations').update(update).eq('id', gen.id)
    return NextResponse.json(summary({ ...gen, ...update, width_cm: widthCm, height_cm: heightCm }))
  } catch (e) {
    console.error('[ar] fechamento', e)
    const error = 'O modelo foi gerado mas não conseguimos salvá-lo. Tente de novo.'
    await supabase
      .from('ar_generations')
      .update({ status: 'failed', error, updated_at: new Date().toISOString() })
      .eq('id', gen.id)
    return NextResponse.json(summary({ ...gen, status: 'failed', error }))
  }
}

/** Só o que a UI precisa — nunca o task_id nem detalhes internos. */
function summary(gen) {
  return {
    id: gen.id,
    status: gen.status,
    model_url: gen.model_url ?? null,
    preview_url: gen.preview_url ?? null,
    size_cm: gen.size_cm ?? null,
    error: gen.error ?? null,
  }
}
