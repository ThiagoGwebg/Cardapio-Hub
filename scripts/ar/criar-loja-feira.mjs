import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const FOTOS = 'C:/Users/jogor/AppData/Local/Temp/claude/389b930032125050/cf75719c-863a-48b4-9d9c-bead2cd905be/images'
const EMAIL = 'feira.ciencias@cardapiohub.com'
const SLUG = 'feira-ciencias'

// 1) conta dona da loja da feira (o painel assume 1 loja por dono, por isso
//    a loja não pode pendurar no usuário que já tem a Sync Services)
const { data: list } = await db.auth.admin.listUsers({ perPage: 200 })
let user = list.users.find(u => u.email === EMAIL)
let senha = null
if (!user) {
  senha = crypto.randomBytes(9).toString('base64url')
  const { data, error } = await db.auth.admin.createUser({
    email: EMAIL, password: senha, email_confirm: true,
  })
  if (error) throw error
  user = data.user
  fs.writeFileSync('.env.feira.local',
    `# Conta da loja de demonstração da feira de ciências (fora do git).\nFEIRA_EMAIL=${EMAIL}\nFEIRA_SENHA=${senha}\n`)
  console.log('usuário criado:', EMAIL, '(senha gravada em .env.feira.local)')
} else {
  console.log('usuário já existia:', EMAIL)
}

// 2) loja
let { data: store } = await db.from('stores').select('*').eq('slug', SLUG).maybeSingle()
if (!store) {
  const { data, error } = await db.from('stores').insert({
    owner_id: user.id,
    slug: SLUG,
    name: 'Doces da Feira',
    whatsapp_number: '11999999999',
    is_open: true,
    accepts_cash: true,
    accepts_pix: true,
    pickup_enabled: true,
    dine_in_enabled: true,
    delivery_enabled: false,
    estimated_prep_min: 10,
  }).select('*').single()
  if (error) throw error
  store = data
  console.log('loja criada:', store.slug, store.id)
} else {
  console.log('loja já existia:', store.slug, store.id)
}

// 3) plano Pro ativo (a seção de RA no painel é exclusiva do Pro)
const { data: sub } = await db.from('subscriptions').select('id').eq('store_id', store.id).maybeSingle()
if (!sub) {
  const { error } = await db.from('subscriptions').insert({ store_id: store.id, plan: 'pro', status: 'active' })
  if (error) throw error
  console.log('assinatura Pro criada')
}

// 4) categoria
let { data: cat } = await db.from('categories').select('*').eq('store_id', store.id).eq('name', 'Bolos de pote').maybeSingle()
if (!cat) {
  const { data, error } = await db.from('categories')
    .insert({ store_id: store.id, name: 'Bolos de pote', emoji: '🍰', sort_order: 1 })
    .select('*').single()
  if (error) throw error
  cat = data
  console.log('categoria criada')
}

// 5) fotos: 4 vistas para a IA + galeria do produto
const VISTAS = { front: '6.jpg', left: '9.jpg', back: '10.jpg', right: '12.jpg' }
const GALERIA = ['12.jpg', '6.jpg', '1.jpg', '15.jpg']

async function sobe(arquivo, destino, largura) {
  const buf = await sharp(path.join(FOTOS, arquivo))
    .rotate()
    .resize({ width: largura, height: largura, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 86 })
    .toBuffer()
  const { error } = await db.storage.from('store-assets')
    .upload(destino, buf, { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' })
  if (error) throw error
  const { data } = db.storage.from('store-assets').getPublicUrl(destino)
  console.log(`  ${arquivo} -> ${destino} (${Math.round(buf.length / 1024)} kB)`)
  return data.publicUrl
}

console.log('fotos das vistas (IA):')
const vistas = {}
for (const [vista, arq] of Object.entries(VISTAS)) {
  vistas[vista] = await sobe(arq, `${store.id}/ar-${vista}.jpg`, 1400)
}
console.log('fotos do cardápio:')
const galeria = []
for (const [i, arq] of GALERIA.entries()) {
  galeria.push(await sobe(arq, `${store.id}/product-bolo-${i + 1}.jpg`, 1200))
}

// 6) produto
let { data: prod } = await db.from('products').select('*').eq('store_id', store.id).eq('name', 'Bolo de Pote de Chocolate').maybeSingle()
const campos = {
  store_id: store.id,
  category_id: cat.id,
  name: 'Bolo de Pote de Chocolate',
  description: 'Camadas de bolo de chocolate molhadinho com brigadeiro cremoso e granulado. Pote de 250 ml.',
  price_cents: 1200,
  image_url: galeria[0],
  images: galeria,
  is_active: true,
  sort_order: 1,
}
if (!prod) {
  const { data, error } = await db.from('products').insert(campos).select('*').single()
  if (error) throw error
  prod = data
  console.log('produto criado:', prod.id)
} else {
  await db.from('products').update(campos).eq('id', prod.id)
  console.log('produto atualizado:', prod.id)
}

fs.writeFileSync('scripts/ar/contexto.json', JSON.stringify(
  { storeId: store.id, slug: SLUG, productId: prod.id, vistas }, null, 2))
console.log('\nOK. contexto salvo em scripts/ar/contexto.json')
