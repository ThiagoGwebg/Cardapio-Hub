// Formatação do estoque. Quantidades são numeric no banco (chegam como
// número ou string do PostgREST) e custos são centavos com fração.

export const STOCK_UNITS = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'kg', label: 'Quilo (kg)' },
  { value: 'g', label: 'Grama (g)' },
  { value: 'l', label: 'Litro (l)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'cx', label: 'Caixa (cx)' },
  { value: 'pct', label: 'Pacote (pct)' },
]
export const UNIT_VALUES = STOCK_UNITS.map((u) => u.value)

// Nomes que aparecem no Histórico — linguagem da cozinha, não de contabilidade.
export const MOVEMENT_LABEL = {
  entrada: 'Entrada',
  saida: 'Uso',
  ajuste: 'Contagem',
  perda: 'Perda',
  venda: 'Venda',
  estorno: 'Cancelamento',
}

// Variação de custo a partir da qual a nota gera alerta.
export const COST_ALERT_PCT = 10

const qtyFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 })
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brlFine = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 })

export const toNum = (v) => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

export function fmtQty(v, unit) {
  return `${qtyFmt.format(toNum(v))}${unit ? ` ${unit}` : ''}`
}

/** Valor em centavos → "R$ 12,34". Custo unitário pequeno ganha até 4 casas. */
export function fmtMoney(cents, { fine = false } = {}) {
  const reais = toNum(cents) / 100
  return (fine && Math.abs(reais) < 1 && reais !== 0 ? brlFine : brl).format(reais)
}

/** "1,5" / "1.5" / "1.234,5" → 1.5 (ou NaN). */
export function parseDecimal(input) {
  if (typeof input === 'number') return input
  let s = String(input ?? '').trim().replace(/\s/g, '')
  if (!s) return NaN
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

export function costVariationPct(prev, next) {
  const p = toNum(prev)
  if (p <= 0) return null
  return ((toNum(next) - p) / p) * 100
}

export function fmtCnpj(cnpj) {
  const d = String(cnpj ?? '').replace(/\D/g, '')
  if (d.length !== 14) return cnpj || ''
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

export function stockStatus(item) {
  const q = toNum(item.quantity)
  const min = toNum(item.min_quantity)
  if (q <= 0) return 'zerado'
  if (min > 0 && q < min) return 'baixo'
  return 'ok'
}

// ── Ajudantes da nota fiscal: menos digitação para o lojista ──────────────

// Unidade comercial da nota → unidade de controle equivalente.
const NF_UNIT = {
  UN: 'un', UND: 'un', UNID: 'un', U: 'un', PC: 'un', PCA: 'un', PECA: 'un',
  KG: 'kg', KGS: 'kg', G: 'g', GR: 'g', GRS: 'g',
  L: 'l', LT: 'l', LTS: 'l', ML: 'ml',
  CX: 'cx', CXA: 'cx', PCT: 'pct', PT: 'pct', PAC: 'pct', FD: 'pct', SC: 'pct', DZ: 'un',
}
const PACK_UNITS = new Set(['CX', 'CXA', 'PCT', 'PT', 'PAC', 'FD', 'SC'])

/** Quantas unidades vêm na embalagem, lido da descrição ("PCT 12UN", "CX C/24"). */
export function packSize(description, nfUnit) {
  const u = String(nfUnit || '').toUpperCase()
  if (u === 'DZ') return 12
  if (!PACK_UNITS.has(u)) return null
  const d = String(description || '').toUpperCase()
  const m = /(?:C\/\s*|X\s*)?(\d{1,4})\s*(?:UN|UND|UNID|UNIDADES|U)\b/.exec(d) || /\bC\/\s*(\d{1,4})\b/.exec(d)
  const n = m ? Number(m[1]) : NaN
  return n > 1 && n <= 1000 ? n : null
}

/** Sugestão de insumo novo a partir de um item da nota: unidade e conversão. */
export function guessFromLine(description, nfUnit) {
  const pack = packSize(description, nfUnit)
  if (pack) return { unit: 'un', conversion: pack }
  return { unit: NF_UNIT[String(nfUnit || '').toUpperCase()] || 'un', conversion: 1 }
}

/** Conversão automática quando as unidades combinam (KG→g = 1000, CX 12UN→un = 12). */
export function suggestConversion(nfUnit, itemUnit, description) {
  const nf = NF_UNIT[String(nfUnit || '').toUpperCase()]
  if (!nf || !itemUnit) return null
  if (nf === itemUnit) return 1
  const pairs = { 'kg>g': 1000, 'g>kg': 0.001, 'l>ml': 1000, 'ml>l': 0.001 }
  if (pairs[`${nf}>${itemUnit}`]) return pairs[`${nf}>${itemUnit}`]
  if (itemUnit === 'un') return packSize(description, nfUnit)
  return null
}

/** "PAO BRIOCHE 60G PCT 12UN" → "Pão brioche 60g" (nome curto e legível). */
export function cleanItemName(description) {
  let s = String(description || '').trim()
  // tira a embalagem do fim ("PCT 12UN", "CX C/24", "FD 6X1L")
  s = s.replace(/\s+(?:CX|CXA|PCT|PT|PAC|FD|SC)\b.*$/i, '')
  s = s.replace(/\s+/g, ' ').trim()
  if (!s) s = String(description || '').trim()
  const lower = s.toLocaleLowerCase('pt-BR')
  // acentos comuns que a NF-e costuma omitir
  const fixed = lower
    .replace(/\bpao\b/g, 'pão').replace(/\bpaes\b/g, 'pães').replace(/\bfile\b/g, 'filé')
    .replace(/\bacucar\b/g, 'açúcar').replace(/\bfeijao\b/g, 'feijão').replace(/\bmaionese\b/g, 'maionese')
    .replace(/\blimao\b/g, 'limão').replace(/\bcebola\b/g, 'cebola').replace(/\bagua\b/g, 'água')
  return (fixed.charAt(0).toLocaleUpperCase('pt-BR') + fixed.slice(1)).slice(0, 120)
}
