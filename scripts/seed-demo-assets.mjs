/**
 * Sobe as imagens da loja demo para o bucket `store-assets` e grava o mapa de
 * URLs em scripts/demo-images.json, que o seed lê para preencher logo, banner e
 * as fotos dos produtos.
 *
 *   node scripts/seed-demo-assets.mjs
 *   node scripts/seed-demo.mjs      # depois, para aplicar as URLs no cardápio
 *
 * Basta soltar os arquivos em scripts/demo-assets/ e rodar. O NOME do arquivo é
 * o que liga a imagem ao produto:
 *
 *   logo.svg              → logo da loja
 *   banner.svg            → banner do topo do cardápio
 *   smash-classico.jpg    → foto do produto de `key` "smash-classico"
 *
 * Sobe em `demo/<arquivo>` com upsert: rodar de novo troca a imagem no lugar,
 * sem criar arquivo órfão e sem mudar a URL já salva nos produtos.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, basename, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { adminClient } from './demo-client.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS_DIR = resolve(ROOT, 'scripts/demo-assets')
const OUT_FILE = resolve(ROOT, 'scripts/demo-images.json')
const BUCKET = 'store-assets'
const PREFIX = 'demo'

const MIME = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

/** logo/banner viram chaves reservadas; o resto é a `key` do produto. */
function mapKey(name) {
  if (name === 'logo') return '__logo'
  if (name === 'banner') return '__banner'
  return name
}

async function main() {
  if (!existsSync(ASSETS_DIR)) {
    throw new Error(`Pasta não encontrada: ${ASSETS_DIR}`)
  }

  const supabase = adminClient()
  const files = readdirSync(ASSETS_DIR).filter((f) => MIME[extname(f).toLowerCase()])
  if (!files.length) throw new Error('Nenhuma imagem em scripts/demo-assets/.')

  // Preserva o que já foi mapeado: subir só uma foto nova não pode apagar as outras.
  const images = existsSync(OUT_FILE) ? JSON.parse(readFileSync(OUT_FILE, 'utf8')) : {}

  for (const file of files) {
    const ext = extname(file).toLowerCase()
    const path = `${PREFIX}/${file}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, readFileSync(resolve(ASSETS_DIR, file)), {
      contentType: MIME[ext],
      upsert: true,
    })
    if (error) throw new Error(`upload ${file}: ${error.message}`)

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    images[mapKey(basename(file, ext))] = data.publicUrl
    console.log(`✓ ${file}`)
  }

  writeFileSync(OUT_FILE, `${JSON.stringify(images, null, 2)}\n`)
  console.log(`\n${files.length} imagem(ns) no bucket. Mapa salvo em scripts/demo-images.json.`)
  console.log('Rode `node scripts/seed-demo.mjs` para aplicar no cardápio.')
}

main().catch((err) => {
  console.error('\n✗', err.message)
  process.exit(1)
})
