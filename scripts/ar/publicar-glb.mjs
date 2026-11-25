/** Publica o .glb local no produto, pela mesma receita de /api/ar/status. */
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { prepareGlb } from './glb.mjs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ctx = JSON.parse(fs.readFileSync('scripts/ar/contexto.json', 'utf8'))
const SIZE_CM = Number(process.argv[2] || 9.6)

const bruto = new Uint8Array(fs.readFileSync('scripts/ar/bolo-de-pote.glb'))
const { glb, widthCm, heightCm } = await prepareGlb(bruto, SIZE_CM)
console.log('processado:', Math.round(glb.length / 1024), 'kB |', widthCm, 'x', heightCm, 'cm')

const { data: gen } = await db.from('ar_generations').insert({
  store_id: ctx.storeId, product_id: ctx.productId, status: 'processing',
  size_cm: SIZE_CM, source_photos: ctx.vistas,
}).select('id').single()

const dest = `${ctx.storeId}/ar/${ctx.productId}-${gen.id}.glb`
const { error } = await db.storage.from('ar-models')
  .upload(dest, glb, { contentType: 'model/gltf-binary', upsert: true, cacheControl: '31536000' })
if (error) throw error
const { data: pub } = db.storage.from('ar-models').getPublicUrl(dest)

await db.from('ar_generations').update({ status: 'published', model_url: pub.publicUrl }).eq('id', gen.id)
await db.from('products').update({ ar_model_url: pub.publicUrl, ar_size_cm: SIZE_CM }).eq('id', ctx.productId)
console.log('publicado:', pub.publicUrl)
