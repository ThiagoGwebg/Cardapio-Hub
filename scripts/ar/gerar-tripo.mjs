/**
 * Dispara a geração do modelo 3D do bolo de pote na Tripo3D e fecha o
 * pipeline igual à rota /api/ar/status: baixa o .glb dentro da janela de
 * 5 min, escala para o tamanho real, comprime e grava no Storage.
 *
 * Uso: node scripts/ar/gerar-tripo.mjs [larguraEmCm]
 */
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { prepareGlb, downloadModel } from './glb.mjs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const KEY = env.TRIPO_API_KEY
if (!KEY) { console.error('Falta TRIPO_API_KEY no .env.local'); process.exit(1) }

const SIZE_CM = Number(process.argv[2] || 9)
const ctx = JSON.parse(fs.readFileSync('scripts/ar/contexto.json', 'utf8'))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const BASE = 'https://api.tripo3d.ai/v2/openapi'
async function tripo(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...init.headers },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.code !== 0) throw new Error(json?.message || json?.error || `Tripo HTTP ${res.status}`)
  return json.data
}

const files = ['front', 'left', 'back', 'right'].map(v => (ctx.vistas[v] ? { type: 'image', url: ctx.vistas[v] } : { type: 'image' }))
const { task_id } = await tripo('/task', {
  method: 'POST',
  body: JSON.stringify({
    type: 'multiview_to_model', files, model_version: 'v3.1-20260211',
    texture: true, pbr: true, texture_alignment: 'original_image',
  }),
})
console.log('task:', task_id)

const { data: gen } = await db.from('ar_generations').insert({
  store_id: ctx.storeId, product_id: ctx.productId, task_id,
  status: 'processing', size_cm: SIZE_CM, source_photos: ctx.vistas,
}).select('id').single()

let task
for (let i = 0; i < 120; i++) {
  await new Promise(r => setTimeout(r, 5000))
  task = await tripo(`/task/${task_id}`)
  process.stdout.write(`\r${task.status} ${task.progress ?? 0}%   `)
  if (['success', 'failed', 'banned', 'expired', 'cancelled', 'unknown'].includes(task.status)) break
}
console.log()
if (task.status !== 'success') {
  await db.from('ar_generations').update({ status: 'failed', error: `tripo: ${task.status}` }).eq('id', gen.id)
  console.error('geração não concluiu:', task.status); process.exit(1)
}

const raw = await downloadModel(task.output?.pbr_model || task.output?.model)
console.log('glb bruto:', Math.round(raw.length / 1024), 'kB')
const { glb, widthCm, heightCm } = await prepareGlb(raw, SIZE_CM)
console.log('processado:', Math.round(glb.length / 1024), 'kB |', widthCm, 'x', heightCm, 'cm')

const dest = `${ctx.storeId}/ar/${ctx.productId}-${gen.id}.glb`
const { error: upErr } = await db.storage.from('store-assets')
  .upload(dest, glb, { contentType: 'model/gltf-binary', upsert: true, cacheControl: '31536000' })
if (upErr) throw upErr
const { data: pub } = db.storage.from('store-assets').getPublicUrl(dest)

await db.from('ar_generations').update({ status: 'published', model_url: pub.publicUrl }).eq('id', gen.id)
await db.from('products').update({ ar_model_url: pub.publicUrl, ar_size_cm: SIZE_CM }).eq('id', ctx.productId)
console.log('\npublicado no cardápio:', pub.publicUrl)
