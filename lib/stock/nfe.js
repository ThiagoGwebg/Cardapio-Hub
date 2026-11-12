import { XMLParser } from 'fast-xml-parser'

// Lê o XML de uma NF-e (modelo 55) — o arquivo que o fornecedor manda por
// e-mail (nfeProc) ou só a NFe assinada. Devolve o que a entrada de estoque
// precisa; não valida assinatura nem consulta a Sefaz (isso é papel da
// integração Focus NFe, quando ligada).

const MAX_XML_BYTES = 2 * 1024 * 1024

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  removeNSPrefix: true,
  // Tudo como texto: CNPJ e códigos com zero à esquerda não podem virar número.
  parseTagValue: false,
  parseAttributeValue: false,
  isArray: (name) => name === 'det',
  processEntities: true,
})

const digits = (v) => String(v ?? '').replace(/\D/g, '')
const text = (v) => (v == null ? '' : String(v).trim())
const num = (v) => {
  const n = Number(String(v ?? '').trim())
  return Number.isFinite(n) ? n : NaN
}

export class NfeError extends Error {}

export function parseNfeXml(xml) {
  if (typeof xml !== 'string' || !xml.trim()) throw new NfeError('Arquivo vazio.')
  if (xml.length > MAX_XML_BYTES) throw new NfeError('Arquivo grande demais para uma NF-e (máx. 2 MB).')
  // Sem DOCTYPE: corta entidades externas / "billion laughs" antes de parsear.
  if (/<!DOCTYPE/i.test(xml)) throw new NfeError('Arquivo XML inválido.')

  let doc
  try {
    doc = parser.parse(xml)
  } catch {
    throw new NfeError('Não foi possível ler o arquivo. Envie o XML da nota (.xml).')
  }

  const nfe = doc?.nfeProc?.NFe ?? doc?.NFe
  const inf = nfe?.infNFe
  if (!inf) throw new NfeError('Este XML não é de uma NF-e. Envie o arquivo .xml que veio do fornecedor.')

  const ide = inf.ide ?? {}
  if (text(ide.mod) && text(ide.mod) !== '55') {
    throw new NfeError('Só notas modelo 55 (NF-e) entram no estoque. Cupom fiscal (NFC-e) não é aceito.')
  }

  const emit = inf.emit ?? {}
  const tot = inf.total?.ICMSTot ?? {}
  const key = digits(inf['@Id']) || digits(doc?.nfeProc?.protNFe?.infProt?.chNFe)

  const items = (inf.det ?? []).map((det, i) => {
    const p = det?.prod ?? {}
    const quantity = num(p.qCom)
    const unitPrice = num(p.vUnCom)
    const total = num(p.vProd)
    if (!(quantity > 0) || !(unitPrice >= 0) || !Number.isFinite(total)) {
      throw new NfeError(`Item ${i + 1} da nota está com quantidade ou valor inválido.`)
    }
    const ean = digits(p.cEAN)
    return {
      line: Number(det['@nItem']) || i + 1,
      code: text(p.cProd) || null,
      ean: ean.length >= 8 ? ean : null,
      description: text(p.xProd) || `Item ${i + 1}`,
      unit: text(p.uCom).toUpperCase() || null,
      quantity,
      unitPriceCents: Math.round(unitPrice * 100 * 10000) / 10000,
      totalCents: Math.round(total * 100),
    }
  })
  if (!items.length) throw new NfeError('A nota não tem itens.')

  const issued = text(ide.dhEmi) || text(ide.dEmi)
  const issuedAt = issued ? new Date(issued) : null

  return {
    accessKey: key.length === 44 ? key : null,
    number: text(ide.nNF) || null,
    series: text(ide.serie) || null,
    issuedAt: issuedAt && !Number.isNaN(issuedAt.getTime()) ? issuedAt.toISOString() : null,
    supplier: {
      name: text(emit.xFant) || text(emit.xNome) || 'Fornecedor',
      legalName: text(emit.xNome) || null,
      cnpj: digits(emit.CNPJ).length === 14 ? digits(emit.CNPJ) : null,
    },
    productsCents: Math.round((num(tot.vProd) || 0) * 100),
    totalCents: Math.round((num(tot.vNF) || 0) * 100),
    items,
  }
}
