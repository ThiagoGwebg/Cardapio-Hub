/**
 * Cliente Supabase com a service role, usado pelos scripts da loja demo.
 *
 * Mora num módulo próprio para que `seed-demo-assets.mjs` possa importá-lo sem
 * carregar `seed-demo.mjs` — importar o seed só para pegar o cliente executaria
 * o seed inteiro como efeito colateral.
 */

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Lê .env.local sem depender de dotenv. Variável já no ambiente tem prioridade. */
function loadEnv() {
  const file = resolve(ROOT, '.env.local')
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}

export function adminClient() {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios (.env.local).')
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
