/**
 * Monta o .glb do bolo de pote por código: sólido de revolução com o perfil
 * real do pote (250 ml) e as fotos do próprio doce como textura.
 *
 * O pote vai SEM TAMPA: com ela, o plástico leitoso cobre o granulado e o
 * doce fica sem graça no visor. Aberto, o perfil percorre a parede externa,
 * vira no lábio da borda, desce pela parede interna e termina na superfície
 * do granulado, recuada ~0,6 cm da borda — é isso que dá a profundidade de
 * pote cheio.
 *
 * Saída: scripts/ar/bolo-de-pote.glb
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { Document, NodeIO } from '@gltf-transform/core'

const FOTOS = 'C:/Users/jogor/AppData/Local/Temp/claude/389b930032125050/cf75719c-863a-48b4-9d9c-bead2cd905be/images'
const SEG = 96                 // segmentos ao redor
const REPETE = 4               // repetições da faixa lateral; PAR fecha o ciclo espelhado sem emenda
const cm = v => v / 100        // cm -> metros

// ---------- texturas ----------
// Faixa lateral: parte central do corpo na foto 6 (menos perspectiva), já
// sem a tampa em cima nem o reflexo da mesa embaixo.
const lateral = await sharp(path.join(FOTOS, '6.jpg'))
  .extract({ left: 585, top: 362, width: 580, height: 596 })
  .resize(640, 512, { fit: 'fill' }).modulate({ brightness: 1.05, saturation: 1.12 })
  .jpeg({ quality: 88 }).toBuffer()

// Granulado: só o miolo da boca do pote na foto 4, sem o aro de plástico.
// O resize para quadrado desfaz o achatamento da elipse (perspectiva).
const granulado = await sharp(path.join(FOTOS, '4.jpg'))
  .extract({ left: 258, top: 106, width: 480, height: 242 })
  .resize(512, 512, { fit: 'fill' }).modulate({ brightness: 1.04, saturation: 1.1 })
  .jpeg({ quality: 90 }).toBuffer()

// ---------- geometria ----------
// Perfil (raio, altura) em cm. A ordem importa: percorrer a superfície de
// fora para dentro mantém todas as normais apontando para fora do sólido.
const CORPO  = [[3.25, 0.05], [3.45, 0.30], [3.62, 1.00], [3.80, 2.20], [3.98, 3.40], [4.16, 4.60], [4.32, 5.50], [4.45, 6.00]]
const LABIO  = [[4.45, 6.00], [4.48, 6.03], [4.46, 6.05], [4.40, 6.05], [4.34, 6.03]]
const PAREDE = [[4.34, 6.03], [4.24, 5.78], [4.16, 5.52]]
const DOCE   = [[4.16, 5.52], [3.90, 5.56], [2.60, 5.60], [1.30, 5.62], [0.00, 5.62]]
const FUNDO  = [[0.00, 0.00], [1.30, 0.00], [2.60, 0.00], [3.25, 0.05]]

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

// 33648 = espelhado: a faixa se repete ao redor sem emenda dura
const matCorpo = material('corpo', textura('lateral', lateral), { wrapS: 33648, rough: 0.45 })
const matDoce = material('granulado', textura('granulado', granulado), { wrapS: 33071, rough: 0.6 })
const matLabio = material('borda', null, { cor: [0.58, 0.52, 0.47, 1], rough: 0.35 })
const matParede = material('parede-interna', null, { cor: [0.26, 0.15, 0.10, 1], rough: 0.5 })
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
console.log('medidas: diâmetro', (4.48 * 2).toFixed(1), 'cm | altura', (6.05).toFixed(1), 'cm | sem tampa')
