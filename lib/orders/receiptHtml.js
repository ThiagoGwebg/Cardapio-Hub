// Versão HTML da comanda — é o que o navegador manda pra impressora.
//
// O documento é auto-suficiente (CSS inline, sem fonte externa): ele é aberto
// num iframe escondido e impresso de lá, então nada do painel vaza pra nota.
// A `@page` com largura fixa e altura `auto` é o que faz a térmica cortar no
// tamanho do conteúdo em vez de cuspir uma folha A4 inteira.

import { fmtCents, fmtOrderNumber, ORDER_TYPE_LABEL, PAYMENT_LABEL, SP_TZ } from '@/lib/format'
import { receiptAddress, receiptTitle } from './receipt'

function esc(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtDateTime(iso) {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: SP_TZ,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function body(order, store) {
  const parts = []
  const rows = []

  parts.push(`<div class="head">
    <div class="store">${esc(store.name)}</div>
    ${store.address ? `<div class="sub">${esc(store.address)}</div>` : ''}
    ${store.whatsapp_number ? `<div class="sub">WhatsApp ${esc(store.whatsapp_number)}</div>` : ''}
  </div>`)

  parts.push(`<div class="hr"></div>
  <div class="row big"><span>COMANDA ${esc(fmtOrderNumber(order.order_number, order.id))}</span><span>${fmtDateTime(order.created_at)}</span></div>
  <div class="type">${esc((ORDER_TYPE_LABEL[order.order_type] ?? order.order_type).toUpperCase())}${
    order.order_type === 'dine_in' && order.table_number ? ` · MESA ${esc(order.table_number)}` : ''
  }</div>
  ${order.scheduled_for ? `<div class="type">AGENDADO P/ ${fmtDateTime(order.scheduled_for)}</div>` : ''}`)

  const addr = receiptAddress(order)
  parts.push(`<div class="hr"></div>
  <div class="label">Cliente</div>
  <div class="strong">${esc(order.customer_name || 'Sem nome')}</div>
  ${order.customer_phone ? `<div>${esc(order.customer_phone)}</div>` : ''}
  ${addr ? `<div>${esc(addr)}</div>` : ''}
  ${order.address_reference ? `<div>Ref.: ${esc(order.address_reference)}</div>` : ''}`)

  parts.push('<div class="hr"></div><div class="label">Itens</div>')
  for (const it of order.order_items) {
    parts.push(`<div class="row"><span class="strong">${it.quantity}x ${esc(it.product_name_snapshot)}</span><span>${fmtCents(
      it.unit_price_cents * it.quantity
    )}</span></div>`)
    for (const op of it.order_item_options) {
      parts.push(`<div class="opt">+ ${esc(op.name_snapshot)}</div>`)
    }
  }

  rows.push(`<div class="row"><span>Subtotal</span><span>${fmtCents(order.subtotal_cents)}</span></div>`)
  if (order.delivery_fee_cents > 0) {
    rows.push(`<div class="row"><span>Entrega</span><span>${fmtCents(order.delivery_fee_cents)}</span></div>`)
  }
  if (order.discount_cents > 0) {
    rows.push(
      `<div class="row"><span>Desconto${order.coupon_code ? ` (${esc(order.coupon_code)})` : ''}</span><span>- ${fmtCents(
        order.discount_cents
      )}</span></div>`
    )
  }
  rows.push(`<div class="row total"><span>TOTAL</span><span>${fmtCents(order.total_cents)}</span></div>`)
  if (order.payment_method) {
    rows.push(
      `<div class="row"><span>Pagamento</span><span>${esc(PAYMENT_LABEL[order.payment_method] ?? order.payment_method)}</span></div>`
    )
  }
  if (order.payment_method === 'cash' && order.change_for_cents) {
    const troco = Math.max(0, order.change_for_cents - order.total_cents)
    rows.push(`<div class="opt">Troco para ${fmtCents(order.change_for_cents)} (levar ${fmtCents(troco)})</div>`)
  }
  parts.push(`<div class="hr"></div>${rows.join('')}`)

  if (order.customer_note) {
    parts.push(`<div class="hr"></div><div class="label">Observação</div><div class="strong">${esc(order.customer_note)}</div>`)
  }

  parts.push('<div class="hr"></div><div class="foot">Cardápio Ágil</div>')
  return parts.join('')
}

/**
 * Documento completo da comanda. Com `autoPrint`, ele chama window.print()
 * sozinho ao carregar — é assim que a impressão automática dispara sem clique.
 */
export function receiptHtml(
  order,
  store,
  opts,
  autoPrint = false
) {
  const width = opts.width === 58 ? 58 : 80
  const copies = Math.min(5, Math.max(1, opts.copies || 1))
  const one = body(order, store)
  // Cada via é uma página: o `page-break-after` faz a térmica cortar entre elas.
  const pages = Array.from({ length: copies }, (_, i) =>
    `<section class="via"${i < copies - 1 ? ' style="page-break-after:always"' : ''}>${one}</section>`
  ).join('')

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${esc(receiptTitle(order))}</title>
<style>
  @page { size: ${width}mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    width: ${width}mm;
    padding: 3mm ${width === 58 ? 2 : 3}mm 6mm;
    font-family: "Courier New", ui-monospace, monospace;
    font-size: ${width === 58 ? 11 : 12}px;
    line-height: 1.35;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .head { text-align: center; margin-bottom: 2mm; }
  .store { font-size: ${width === 58 ? 15 : 17}px; font-weight: 700; text-transform: uppercase; line-height: 1.15; }
  .sub { font-size: ${width === 58 ? 10 : 11}px; }
  .hr { border-top: 1px dashed #000; margin: 2mm 0 1.5mm; }
  .row { display: flex; justify-content: space-between; gap: 6px; }
  .row > span:last-child { white-space: nowrap; }
  .big { font-size: ${width === 58 ? 12 : 13}px; font-weight: 700; }
  .type { font-weight: 700; text-transform: uppercase; }
  .label { font-size: ${width === 58 ? 10 : 11}px; text-transform: uppercase; letter-spacing: .06em; margin-bottom: .5mm; }
  .strong { font-weight: 700; }
  .opt { padding-left: 4mm; font-size: ${width === 58 ? 10 : 11}px; }
  .total { font-size: ${width === 58 ? 14 : 16}px; font-weight: 700; margin-top: 1mm; }
  .foot { text-align: center; font-size: 10px; margin-top: 1mm; }
  .via { break-inside: auto; }
</style>
</head>
<body>${pages}${
    autoPrint
      ? `<script>
  // Espera o layout assentar antes de abrir a impressão (senão o Chrome
  // às vezes mede a página no meio do carregamento e corta a última linha).
  window.addEventListener('load', function () {
    requestAnimationFrame(function () { setTimeout(function () { window.print() }, 60) })
  })
</script>`
      : ''
  }</body>
</html>`
}
