// Comanda (nota do pedido) para impressora térmica de 58mm / 80mm.
//
// Dois formatos a partir dos MESMOS dados:
//  • HTML  — impresso pelo navegador num iframe escondido (driver do SO).
//            Aceita acentos e negrito de verdade; é o modo que funciona em
//            qualquer impressora instalada no computador.
//  • TEXTO — bytes ESC/POS crus, pro RawBT (Android + impressora Bluetooth)
//            e pra quem manda direto pra porta da impressora. Aqui os acentos
//            saem como lixo na maioria das térmicas (que usam CP437/CP850),
//            então o texto é normalizado sem acento de propósito.

import { fmtCents, fmtOrderNumber, ORDER_TYPE_LABEL, PAYMENT_LABEL, SP_TZ } from '@/lib/format'


// Colunas por largura de papel (fonte A, 12x24): 58mm = 32, 80mm = 48.
export const COLS = { 58: 32, 80: 48 }


export const DEFAULT_RECEIPT_OPTIONS = { width: 80, copies: 1 }

// Colunas do SELECT — a rota e qualquer outro consumidor usam esta constante
// pra garantir que a comanda nunca fique sem um campo que o layout espera.
export const RECEIPT_SELECT =
  'id, order_number, status, order_type, payment_method, change_for_cents, customer_name, customer_phone, customer_note, subtotal_cents, delivery_fee_cents, discount_cents, total_cents, coupon_code, table_number, address_cep, address_street, address_number, address_complement, address_neighborhood, address_reference, created_at, scheduled_for, order_items(id, product_name_snapshot, quantity, unit_price_cents, order_item_options(name_snapshot, group_name_snapshot))'



function fmtDateTime(iso) {
  // Fuso fixo da loja: o servidor roda em UTC e imprimiria a hora errada.
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: SP_TZ,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Endereço de entrega em uma linha só (ou null quando não é entrega). */
export function receiptAddress(order) {
  if (order.order_type !== 'delivery' || !order.address_street) return null
  const comp = order.address_complement ? ` (${order.address_complement})` : ''
  const bairro = order.address_neighborhood ? ` - ${order.address_neighborhood}` : ''
  const cep = order.address_cep ? ` - CEP ${order.address_cep}` : ''
  return `${order.address_street}, ${order.address_number || 's/n'}${comp}${bairro}${cep}`
}

/** Título curto usado na aba de impressão. */
export function receiptTitle(order) {
  return `Comanda ${fmtOrderNumber(order.order_number, order.id)}`
}

// ── Formato TEXTO (ESC/POS) ───────────────────────────────────────

// Sobras que o NFD não resolve porque não são letra + acento solto.
const ASCII_FOLD = {
  'º': 'o',
  'ª': 'a',
  '°': ' ',
  'ç': 'c',
  'Ç': 'C',
  '–': '-',
  '—': '-',
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
  '…': '...',
}

/**
 * Reduz o texto a ASCII puro: a térmica trabalha em CP437 e imprimiria "ç",
 * "ã" e "º" como lixo. É também o que garante que `row()` conte as colunas
 * certas — um caractere fora da tabela desalinharia a coluna de preços.
 */
function noAccent(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e\n]/g, (ch) => ASCII_FOLD[ch] ?? '')
}

/** Quebra em várias linhas respeitando as palavras. */
function wrap(text, cols, indent = '') {
  const out = []
  for (const paragraph of noAccent(text).split('\n')) {
    let line = ''
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word
      if (candidate.length + indent.length <= cols) {
        line = candidate
        continue
      }
      if (line) out.push(indent + line)
      // Palavra sozinha maior que a linha (nome colado, URL): corta na força.
      line = word
      while (line.length + indent.length > cols) {
        out.push(indent + line.slice(0, cols - indent.length))
        line = line.slice(cols - indent.length)
      }
    }
    if (line) out.push(indent + line)
  }
  return out.length ? out : ['']
}

/** "Esquerda .......... Direita" ocupando exatamente `cols` colunas. */
function row(left, right, cols) {
  const l = noAccent(left)
  const r = noAccent(right)
  const space = cols - l.length - r.length
  if (space >= 1) return l + ' '.repeat(space) + r
  // Não coube na mesma linha: joga o valor pra linha de baixo, alinhado à direita.
  return [...wrap(l, cols), r.padStart(cols)].join('\n')
}

function center(text, cols) {
  const t = noAccent(text).slice(0, cols)
  const pad = Math.max(0, Math.floor((cols - t.length) / 2))
  return ' '.repeat(pad) + t
}

/** Comanda em texto puro, já quebrada na largura do papel. */
export function receiptText(order, store, opts) {
  const cols = COLS[opts.width] ?? COLS[80]
  const div = '-'.repeat(cols)
  const out = []

  out.push(center(store.name.toUpperCase(), cols))
  if (store.address) out.push(...wrap(store.address, cols).map((l) => center(l, cols)))
  if (store.whatsapp_number) out.push(center(`WhatsApp ${store.whatsapp_number}`, cols))
  out.push(div)

  out.push(row(`COMANDA ${fmtOrderNumber(order.order_number, order.id)}`, fmtDateTime(order.created_at), cols))
  out.push((ORDER_TYPE_LABEL[order.order_type] ?? order.order_type).toUpperCase())
  if (order.order_type === 'dine_in' && order.table_number) out.push(`MESA ${order.table_number}`)
  if (order.scheduled_for) out.push(`AGENDADO P/ ${fmtDateTime(order.scheduled_for)}`)
  out.push(div)

  out.push('CLIENTE')
  out.push(...wrap(order.customer_name || 'Sem nome', cols))
  if (order.customer_phone) out.push(order.customer_phone)
  const addr = receiptAddress(order)
  if (addr) out.push(...wrap(addr, cols))
  if (order.address_reference) out.push(...wrap(`Ref.: ${order.address_reference}`, cols))
  out.push(div)

  out.push('ITENS')
  for (const it of order.order_items) {
    out.push(row(`${it.quantity}x ${it.product_name_snapshot}`, fmtCents(it.unit_price_cents * it.quantity), cols))
    for (const op of it.order_item_options) {
      out.push(...wrap(`+ ${op.name_snapshot}`, cols, '   '))
    }
  }
  out.push(div)

  out.push(row('Subtotal', fmtCents(order.subtotal_cents), cols))
  if (order.delivery_fee_cents > 0) out.push(row('Entrega', fmtCents(order.delivery_fee_cents), cols))
  if (order.discount_cents > 0) {
    out.push(row(`Desconto${order.coupon_code ? ` (${order.coupon_code})` : ''}`, `-${fmtCents(order.discount_cents)}`, cols))
  }
  out.push(row('TOTAL', fmtCents(order.total_cents), cols))
  if (order.payment_method) out.push(row('Pagamento', PAYMENT_LABEL[order.payment_method] ?? order.payment_method, cols))
  if (order.payment_method === 'cash' && order.change_for_cents) {
    const troco = Math.max(0, order.change_for_cents - order.total_cents)
    out.push(...wrap(`Troco para ${fmtCents(order.change_for_cents)} (levar ${fmtCents(troco)})`, cols))
  }

  if (order.customer_note) {
    out.push(div)
    out.push('OBSERVACAO')
    out.push(...wrap(order.customer_note, cols))
  }

  out.push(div)
  out.push(center('Cardapio Agil', cols))

  return out.join('\n')
}

/** Comanda como bytes ESC/POS: inicializa, imprime as vias, avança e corta. */
export function receiptEscPos(order, store, opts) {
  const body = receiptText(order, store, opts)
  const bytes = []
  const push = (s) => {
    for (const ch of s) {
      const code = ch.charCodeAt(0)
      bytes.push(code < 128 ? code : 63) // fora do ASCII vira "?" — o texto já vem sem acento
    }
  }

  bytes.push(0x1b, 0x40) // ESC @      — reset
  bytes.push(0x1b, 0x74, 0x00) // ESC t 0    — tabela de caracteres CP437

  for (let i = 0; i < Math.max(1, opts.copies); i++) {
    push(body)
    bytes.push(0x0a, 0x0a, 0x0a, 0x0a) // avanço pro papel sair da guilhotina
    bytes.push(0x1d, 0x56, 0x42, 0x00) // GS V B 0 — corte parcial
  }

  return Uint8Array.from(bytes)
}
