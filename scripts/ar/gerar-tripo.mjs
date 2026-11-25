/**
 * Gera o modelo 3D do bolo de pote na Tripo3D e fecha o pipeline igual à rota
 * /api/ar/status: baixa o .glb dentro da janela de 5 min, escala para o tamanho
 * real, comprime e grava no Storage.
 *
 * Dois modos:
 *  - padrão: imagem única — a melhor foto de estúdio da grade
 *    (scripts/ar/fonte/grade-pote.webp, vista lateral sem tampa), recortada e
 *    ampliada. As nove fotos da grade são quase o mesmo ângulo, então não há
 *    vistas de verdade para um multiview; a Tripo imagina o resto do pote.
 *  - --vistas: multiview com as 4 fotos de contexto.json (as da toalha).
 *
 * Uso: node scripts/ar/gerar-tripo.mjs [larguraEmCm] [--vistas]
 */
import fs from 'node:fs'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'
import { prepareGlb, downloadModel } from './glb.mjs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const KEY = env.TRIPO_API_KEY
if (!KEY) { console.error('Falta TRIPO_API_KEY no .env.local'); process.exit(1) }

const args = process.argv.slice(2)
const MULTIVIEW = args.includes('--vistas')
const SIZE_CM = Number(args.find(a => !a.startsWith('--')) || 9)
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

// Sem saldo, para antes de criar qualquer registro: evita linha órfã em ar_generations.
const { balance } = await tripo('/user/balance')
if (!(balance > 0)) {
  console.error(`Conta Tripo sem créditos (saldo ${balance}). Compre créditos em platform.tripo3d.ai e rode de novo.`)
  process.exit(1)
}
console.log('saldo Tripo:', balance)

let corpo
let fotos
if (MULTIVIEW) {
  const files = ['front', 'left', 'back', 'right']
    .map(v => (ctx.vistas[v] ? { type: 'image', url: ctx.vistas[v] } : { type: 'image' }))
  corpo = { type: 'multiview_to_model', files }
  fotos = ctx.vistas
} else {
  // Vista lateral sem tampa: linha 1, coluna 2 da grade 3x3. Recorta o pote com
  // folga e amplia 4x — a Tripo recorta o fundo sozinha, mas precisa de pixels.
  const FONTE = 'scripts/ar/fonte/grade-pote.webp'
  const meta = await sharp(FONTE).metadata()
  const w = Math.floor(meta.width / 3), h = Math.floor(meta.height / 3)
  const jpg = await sharp(FONTE)
    .extract({ left: w + 96, top: 66, width: 218, height: 196 })
    .resize(872, 784, { kernel: 'lanczos3' })
    .jpeg({ quality: 92 })
    .toBuffer()
  const path = `${ctx.storeId}/ar-fonte-grade.jpg`
  const { error } = await db.storage.from('store-assets')
    .upload(path, jpg, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' })
  if (error) throw error
  const { data: pubImg } = db.storage.from('store-assets').getPublicUrl(path)
  corpo = { type: 'image_to_model', file: { type: 'jpg', url: pubImg.publicUrl } }
  fotos = { front: pubImg.publicUrl }
}

const { task_id } = await tripo('/task', {
  method: 'POST',
  body: JSON.stringify({
    ...corpo, model_version: 'v3.1-20260211',
    texture: true, pbr: true, texture_alignment: 'original_image',
  }),
})
console.log('task:', task_id, MULTIVIEW ? '(multiview)' : '(imagem única)')

const { data: gen } = await db.from('ar_generations').insert({
  store_id: ctx.storeId, product_id: ctx.productId, task_id,
  status: 'processing', size_cm: SIZE_CM, source_photos: fotos,
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

// Bucket ar-models: store-assets só aceita imagem e recusaria o model/gltf-binary.
const dest = `${ctx.storeId}/ar/${ctx.productId}-${gen.id}.glb`
const { error: upErr } = await db.storage.from('ar-models')
  .upload(dest, glb, { contentType: 'model/gltf-binary', upsert: true, cacheControl: '31536000' })
if (upErr) throw upErr
const { data: pub } = db.storage.from('ar-models').getPublicUrl(dest)

await db.from('ar_generations').update({ status: 'published', model_url: pub.publicUrl }).eq('id', gen.id)
await db.from('products').update({ ar_model_url: pub.publicUrl, ar_size_cm: SIZE_CM }).eq('id', ctx.productId)
console.log('\npublicado no cardápio:', pub.publicUrl)
