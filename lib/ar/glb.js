// Sem 'server-only' de propósito: não guarda segredo nenhum (processamento
// puro de arquivo) e assim dá pra testar direto no Node. Quem conversa com a
// API (lib/ar/tripo.js) continua protegido.
import { NodeIO, getBounds } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, textureCompress } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import sharp from 'sharp'

/**
 * Pós-processamento do .glb que a Tripo devolve, antes de ir pro Storage:
 *
 * 1. Descomprime (a Tripo usa meshopt; sem decodificar aqui, o model-viewer
 *    precisaria de decoder externo no celular do cliente).
 * 2. Escala o modelo para o TAMANHO REAL informado pelo lojista — é isso que
 *    faz o prato aparecer na mesa do cliente no tamanho certo. A IA devolve
 *    o modelo numa escala arbitrária; `sizeCm` é a largura real do prato.
 * 3. Apoia o modelo no chão (y = 0, centrado em x/z), como o Scene Viewer e
 *    o Quick Look esperam.
 * 4. Comprime as texturas para JPEG 1024 (mesma receita da demo de vendas):
 *    o arquivo cai de dezenas de MB para poucos MB e carrega rápido no 4G.
 */

let io
async function getIO() {
  if (!io) {
    await MeshoptDecoder.ready
    await MeshoptEncoder.ready
    io = new NodeIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({
        'meshopt.decoder': MeshoptDecoder,
        'meshopt.encoder': MeshoptEncoder,
      })
  }
  return io
}

/**
 * @param {ArrayBuffer|Uint8Array} input bytes do .glb original
 * @param {number} sizeCm largura real do prato em centímetros
 * @returns {Promise<{ glb: Uint8Array, widthCm: number, heightCm: number }>}
 */
export async function prepareGlb(input, sizeCm) {
  const reader = await getIO()
  const doc = await reader.readBinary(input instanceof Uint8Array ? input : new Uint8Array(input))

  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0]
  if (!scene) throw new Error('glb sem cena')

  // Remove a compressão de malha do documento (já decodificada na leitura) —
  // o arquivo final sai em glb "puro", que qualquer visualizador abre.
  for (const ext of doc.getRoot().listExtensionsUsed()) {
    if (ext.extensionName === 'EXT_meshopt_compression') ext.dispose()
  }

  const before = getBounds(scene)
  const dx = before.max[0] - before.min[0]
  const dz = before.max[2] - before.min[2]
  const widest = Math.max(dx, dz)
  if (!(widest > 0)) throw new Error('glb com dimensões zeradas')

  // Fator que leva a maior dimensão horizontal até a largura real (metros).
  const factor = (sizeCm / 100) / widest

  // Agrupa tudo sob um nó raiz para escalar e posicionar de uma vez.
  const root = doc.createNode('prato')
  for (const child of scene.listChildren()) {
    scene.removeChild(child)
    root.addChild(child)
  }
  scene.addChild(root)
  root.setScale([factor, factor, factor])

  const scaled = getBounds(scene)
  root.setTranslation([
    -(scaled.min[0] + scaled.max[0]) / 2,
    -scaled.min[1],
    -(scaled.min[2] + scaled.max[2]) / 2,
  ])

  await doc.transform(dedup(), prune())
  try {
    await doc.transform(
      textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [1024, 1024], quality: 80 })
    )
  } catch {
    // Sem sharp disponível, segue com as texturas originais — só fica maior.
  }

  const after = getBounds(scene)
  const widthCm = Math.round(Math.max(after.max[0] - after.min[0], after.max[2] - after.min[2]) * 100)
  const heightCm = Math.round((after.max[1] - after.min[1]) * 100)

  const glb = await reader.writeBinary(doc)
  return { glb, widthCm, heightCm }
}

/** Baixa a URL temporária da Tripo (expira em ~5 min) para memória. */
export async function downloadModel(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download do modelo falhou (${res.status})`)
  return new Uint8Array(await res.arrayBuffer())
}
