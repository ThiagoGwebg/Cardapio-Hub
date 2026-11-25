/**
 * Monta o .glb do bolo de pote por código: sólido de revolução com o perfil
 * real do pote e as fotos do próprio doce como textura.
 *
 * Fonte: scripts/ar/fonte/grade-pote.webp — grade 3x3 de fotos de estúdio
 * (fundo branco). Usamos a vista lateral sem tampa (linha 1, coluna 2) para
 * a parede e a vista de cima (linha 2, coluna 2) para o granulado.
 *
 * O pote vai SEM TAMPA: o perfil percorre a parede externa, vira no lábio da
 * borda, desce pela parede interna e termina na superfície do granulado,
 * levemente recuada da borda.
 *
 * Saída: scripts/ar/bolo-de-pote.glb
 */
import fs from 'node:fs'
import sharp from 'sharp'
import { Document, NodeIO } from '@gltf-transform/core'

const FONTE = 'scripts/ar/fonte/grade-pote.webp'
const SEG = 96                 // segmentos ao redor
const REPETE = 3               // repetições do ladrilho ao redor do pote
const cm = v => v / 100        // cm -> metros

// ---------- texturas ----------
const meta = await sharp(FONTE).metadata()
const LADO_W = Math.floor(meta.width / 3)
const LADO_H = Math.floor(meta.height / 3)
/** Recorta um ladrilho (linha, coluna) da grade. */
const ladrilho = (linha, coluna) =>
  sharp(FONTE)
    .extract({ left: coluna * LADO_W, top: linha * LADO_H, width: LADO_W, height: LADO_H })
    .png()
    .toBuffer()

// Parede: miolo da vista lateral. Cada pote tem só ~170 px de largura na grade,
// então sobe 4x com Lanczos. NÃO se afia: com tão pouca resolução a nitidez só
// amplifica os blocos de compressão; suavizar deixa as camadas limpas, que é o
// que se lê de longe.
// Em vez de espelhar a faixa (que cria 'carinhas' simétricas nas migalhas), ela
// vira um ladrilho SEM EMENDA: as bordas são fundidas e a textura simplesmente
// se repete ao redor do pote.
const FAIXA_W = 480
const FUSAO = 64
const { data: faixa, info: faixaInfo } = await sharp(await ladrilho(0, 1))
  .extract({ left: 144, top: 143, width: 120, height: 95 })   // pula o reflexo do plástico sob a borda
  .resize(FAIXA_W, 380, { kernel: 'lanczos3' })
  .blur(2.2)
  // Esquenta: a foto de estúdio puxa para o azul e o cacau fica acinzentado.
  .recomb([[1.03, 0, 0], [0, 1.0, 0], [0, 0, 0.9]])
  .modulate({ brightness: 0.96, saturation: 1.0 })
  .raw()
  .toBuffer({ resolveWithObject: true })

const ch = faixaInfo.channels
const larg = FAIXA_W - FUSAO
const ladrilhoSemEmenda = Buffer.alloc(larg * faixaInfo.height * ch)
for (let y = 0; y < faixaInfo.height; y++) {
  for (let x = 0; x < larg; x++) {
    for (let c = 0; c < ch; c++) {
      const base = faixa[(y * FAIXA_W + x) * ch + c]
      let v = base
      if (x < FUSAO) {
        // início do ladrilho: mistura com o trecho que sobrou no fim da faixa
        const sobra = faixa[(y * FAIXA_W + (larg + x)) * ch + c]
        const a = 1 - x / FUSAO
        v = Math.round(sobra * a + base * (1 - a))
      }
      ladrilhoSemEmenda[(y * larg + x) * ch + c] = v
    }
  }
}
const parede = await sharp(ladrilhoSemEmenda, { raw: { width: larg, height: faixaInfo.height, channels: ch } })
  .jpeg({ quality: 90 })
  .toBuffer()

// Granulado: vista de cima, recortada no disco do pote (centro ~ (200,148), ⌀ ~204).
const granulado = await sharp(await ladrilho(1, 1))
  .extract({ left: 98, top: 46, width: 204, height: 204 })
  .resize(768, 768, { kernel: 'lanczos3' })
  .recomb([[0.94, 0.02, 0], [0, 0.98, 0], [0, 0, 0.92]])
  .modulate({ brightness: 0.72, saturation: 0.9 })
  .jpeg({ quality: 90 })
  .toBuffer()

// ---------- geometria ----------
// Perfil (raio, altura) em cm. A ordem importa: percorrer a superfície de
// fora para dentro mantém todas as normais apontando para fora do sólido.
// Pote cônico: boca ⌀ ~9 cm, base ⌀ ~7 cm, 7 cm de altura (medido nas fotos).
const CORPO  = [[3.35, 0.02], [3.50, 0.25], [3.62, 1.00], [3.85, 3.00], [4.08, 5.00], [4.28, 6.50], [4.40, 6.95]]
const LABIO  = [[4.40, 6.95], [4.45, 7.00], [4.44, 7.03], [4.39, 7.03], [4.35, 7.00]]
const PAREDE = [[4.35, 7.00], [4.27, 6.90], [4.20, 6.72]]
const DOCE   = [[4.20, 6.72], [3.60, 6.78], [2.40, 6.84], [1.20, 6.87], [0.00, 6.88]]
// Fundo do CENTRO para fora: a normal do disco aponta para baixo.
const FUNDO  = [[0.00, 0.00], [1.30, 0.00], [2.60, 0.00], [3.35, 0.02]]

/** Normais do perfil: perpendicular a cada segmento, suavizada por vértice. */
function normaisPerfil(pts) {
  const seg = []
  for (let i = 0; i < pts.length - 1; i++) {
    const dr = pts[i + 1][0] - pts[i][0]
    const dy = pts[i + 1][1] - pts[i][1]
    const len = Math.hypot(dr, dy) || 1
    seg.push([dy / len, -dr / len])
  }
  return pts.map((_, i) => {
    const a = seg[i - 1], b = seg[i]
    const nr = ((a?.[0] ?? 0) + (b?.[0] ?? 0))
    const ny = ((a?.[1] ?? 0) + (b?.[1] ?? 0))
    const len = Math.hypot(nr, ny) || 1
    return [nr / len, ny / len]
  })
}

/**
 * Revoluciona um perfil. `uv` recebe (índice do anel, fração angular, ponto)
 * e devolve [u, v] — é o que diferencia a faixa enrolada do disco radial.
 */
function revolucao(pts, uv) {
  const nrm = normaisPerfil(pts)
  const pos = [], nor = [], tex = [], idx = []
  for (let i = 0; i < pts.length; i++) {
    const [r, y] = pts[i]
    const [nr, ny] = nrm[i]
    for (let j = 0; j <= SEG; j++) {
      const t = j / SEG
      const ang = t * Math.PI * 2
      const cos = Math.cos(ang), sin = Math.sin(ang)
      pos.push(cm(r * cos), cm(y), cm(r * sin))
      nor.push(nr * cos, ny, nr * sin)
      const [u, v] = uv(i, t, pts[i])
      tex.push(u, v)
    }
  }
  const linha = SEG + 1
  for (let i = 0; i < pts.length - 1; i++) {
    for (let j = 0; j < SEG; j++) {
      const a = i * linha + j, b = a + 1, c = a + linha, d = c + 1
      idx.push(a, c, b, b, c, d)
    }
  }
  return {
    pos: new Float32Array(pos), nor: new Float32Array(nor),
    tex: new Float32Array(tex), idx: new Uint32Array(idx),
  }
}

const yMin = CORPO[0][1], yMax = CORPO[CORPO.length - 1][1]
const corpoG = revolucao(CORPO, (i, t, p) => [t * REPETE, 1 - (p[1] - yMin) / (yMax - yMin)])
const labioG = revolucao(LABIO, () => [0.5, 0.5])
const paredeG = revolucao(PAREDE, () => [0.5, 0.5])
const fundoG = revolucao(FUNDO, () => [0.5, 0.5])
// Disco do granulado: UV radial, para a foto cair como vista de cima.
const doceG = revolucao(DOCE, (i, t, p) => {
  const raio = p[0] / DOCE[0][0] * 0.5
  const ang = t * Math.PI * 2
  return [0.5 + raio * Math.cos(ang), 0.5 + raio * Math.sin(ang)]
})

// ---------- documento glTF ----------
const doc = new Document()
const buf = doc.createBuffer()

function textura(nome, bytes) {
  return doc.createTexture(nome).setImage(bytes).setMimeType('image/jpeg')
}
function material(nome, tex, { wrapS = 10497, rough = 0.55, cor = [1, 1, 1, 1] } = {}) {
  const m = doc.createMaterial(nome).setBaseColorFactor(cor).setMetallicFactor(0).setRoughnessFactor(rough)
  if (tex) {
    m.setBaseColorTexture(tex)
    m.getBaseColorTextureInfo().setWrapS(wrapS).setWrapT(33071)
  }
  return m
}
function primitiva(g, mat) {
  const acc = (arr, tipo) => doc.createAccessor().setArray(arr).setType(tipo).setBuffer(buf)
  return doc.createPrimitive()
    .setAttribute('POSITION', acc(g.pos, 'VEC3'))
    .setAttribute('NORMAL', acc(g.nor, 'VEC3'))
    .setAttribute('TEXCOORD_0', acc(g.tex, 'VEC2'))
    .setIndices(acc(g.idx, 'SCALAR'))
    .setMaterial(mat)
}

// 10497 = repete; o ladrilho já é sem emenda
const matCorpo = material('corpo', textura('parede', parede), { wrapS: 10497, rough: 0.4 })
const matDoce = material('granulado', textura('granulado', granulado), { wrapS: 33071, rough: 0.6 })
const matLabio = material('borda', null, { cor: [0.40, 0.34, 0.30, 1], rough: 0.35 })
const matParede = material('parede-interna', null, { cor: [0.26, 0.16, 0.11, 1], rough: 0.5 })
const matFundo = material('fundo', null, { cor: [0.21, 0.12, 0.08, 1], rough: 0.7 })

const mesh = doc.createMesh('bolo-de-pote')
  .addPrimitive(primitiva(corpoG, matCorpo))
  .addPrimitive(primitiva(labioG, matLabio))
  .addPrimitive(primitiva(paredeG, matParede))
  .addPrimitive(primitiva(doceG, matDoce))
  .addPrimitive(primitiva(fundoG, matFundo))

const node = doc.createNode('bolo-de-pote').setMesh(mesh)
const scene = doc.createScene('cena').addChild(node)
doc.getRoot().setDefaultScene(scene)

const glb = await new NodeIO().writeBinary(doc)
fs.writeFileSync('scripts/ar/bolo-de-pote.glb', glb)
console.log('glb gerado:', Math.round(glb.length / 1024), 'kB')
console.log('medidas: boca ⌀', (4.5 * 2).toFixed(1), 'cm | base ⌀', (3.35 * 2).toFixed(1), 'cm | altura 7.0 cm | sem tampa')
