import 'server-only'

/**
 * Cliente mínimo da API da Tripo3D (geração de modelo 3D por IA).
 *
 * Endpoint único de tarefas: POST cria, GET /:id consulta. A URL do .glb que
 * a Tripo devolve EXPIRA em ~5 minutos — quem consultar precisa baixar o
 * arquivo na hora e guardar no nosso Storage (ver lib/ar/glb.js).
 *
 * Docs: https://docs.tripo3d.ai
 */

const BASE = 'https://api.tripo3d.ai/v2/openapi'
const MODEL_VERSION = 'v3.0-20250812'

function apiKey() {
  const key = process.env.TRIPO_API_KEY
  if (!key) throw new Error('TRIPO_API_KEY não configurada')
  return key
}

async function tripo(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.code !== 0) {
    const msg = json?.message || json?.error || `Tripo HTTP ${res.status}`
    throw new Error(msg)
  }
  return json.data
}

/**
 * Cria a tarefa multiview. `photos` = { front, left, back, right } com URLs
 * públicas (as fotos já estão no nosso Storage). A lista enviada tem SEMPRE
 * 4 itens na ordem frente/esquerda/trás/direita; vista sem foto vai como
 * item vazio — é assim que a API entende "omitida". Frente é obrigatória e
 * a API exige pelo menos 2 vistas no total.
 */
export async function createMultiviewTask(photos) {
  const files = ['front', 'left', 'back', 'right'].map((view) =>
    photos[view] ? { type: 'image', url: photos[view] } : { type: 'image' }
  )
  const data = await tripo('/task', {
    method: 'POST',
    body: JSON.stringify({
      type: 'multiview_to_model',
      files,
      model_version: MODEL_VERSION,
      texture: true,
      pbr: true,
      // Fiel à foto: para comida, parecer com o prato real importa mais do
      // que geometria perfeita.
      texture_alignment: 'original_image',
    }),
  })
  return data.task_id
}

/**
 * Consulta a tarefa. Status possíveis: queued | running | success | failed |
 * banned | expired | cancelled | unknown. No sucesso, `output.pbr_model` (ou
 * `output.model`) tem a URL temporária do .glb e `output.rendered_image` um
 * preview em imagem.
 */
export async function getTask(taskId) {
  return tripo(`/task/${encodeURIComponent(taskId)}`)
}

/** True quando o status da Tripo é terminal e não vai mais mudar. */
export function isFinalStatus(status) {
  return ['success', 'failed', 'banned', 'expired', 'cancelled', 'unknown'].includes(status)
}

/** Mensagem amigável para o lojista quando a geração não dá certo. */
export function friendlyTaskError(status) {
  if (status === 'banned') return 'As fotos foram recusadas pelo filtro de conteúdo. Use fotos do prato.'
  if (status === 'expired') return 'A geração expirou no servidor. Tente de novo.'
  return 'A geração falhou no servidor de IA. Tente de novo — esta tentativa não consumiu sua cota.'
}
