// Impressão da comanda no dispositivo do lojista.
//
// A configuração é POR APARELHO (localStorage, igual aos alertas de som): a
// impressora está no balcão, não na conta. O mesmo painel aberto no celular do
// dono não deve cuspir papel na cozinha.
//
// Dois modos:
//  • 'browser' — abre a comanda num iframe escondido e manda imprimir. Cai na
//    impressora padrão do computador. No Chrome iniciado com --kiosk-printing
//    sai direto, sem diálogo; sem a flag, aparece a janela de impressão.
//  • 'rawbt'   — Android com impressora térmica Bluetooth. Manda os bytes
//    ESC/POS pro app RawBT via URI `rawbt:base64,…`; imprime sem diálogo.

import { useSyncExternalStore } from 'react'



export const DEFAULT_PRINT_SETTINGS = { mode: 'off', width: 80, copies: 1 }

const SETTINGS_KEY = 'cardapio_autoprint'
const PRINTED_KEY = 'cardapio_autoprint_done'
/** Evento local pra sincronizar as telas abertas quando a config muda. */
export const PRINT_SETTINGS_EVENT = 'cardapio-autoprint-changed'

export function loadPrintSettings() {
  if (typeof window === 'undefined') return DEFAULT_PRINT_SETTINGS
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_PRINT_SETTINGS
    const saved = JSON.parse(raw);
    return {
      mode: saved.mode === 'browser' || saved.mode === 'rawbt' ? saved.mode : 'off',
      width: saved.width === 58 ? 58 : 80,
      copies: Math.min(5, Math.max(1, Number(saved.copies) || 1)),
    }
  } catch {
    return DEFAULT_PRINT_SETTINGS
  }
}

export function savePrintSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  window.dispatchEvent(new Event(PRINT_SETTINGS_EVENT))
}

// A config é lida do localStorage, que o servidor não enxerga. useSyncExternalStore
// resolve isso sem efeito colateral: renderiza o padrão no servidor, troca pelo
// valor real na hidratação e reage a mudanças — inclusive em outra aba ('storage').
let cached = null

function snapshot() {
  // O objeto precisa manter a mesma referência entre renders, senão o React
  // entra em laço; só recriamos quando um evento invalida o cache.
  if (cached === null) cached = loadPrintSettings()
  return cached
}

function subscribe(onChange) {
  const handler = () => {
    cached = null
    onChange()
  }
  window.addEventListener(PRINT_SETTINGS_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(PRINT_SETTINGS_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

/** Config de impressão deste aparelho, reativa a mudanças. */
export function usePrintSettings() {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULT_PRINT_SETTINGS)
}

// ── Antiduplicidade ───────────────────────────────────────────────
// O realtime pode reentregar um INSERT (reconexão de rede) e o pedido pago
// online chega duas vezes: uma no INSERT, outra no UPDATE do pagamento.
// Sem isto o lojista imprimiria a mesma comanda duas ou três vezes.

function loadPrinted() {
  try {
    return JSON.parse(localStorage.getItem(PRINTED_KEY) || '{}');
  } catch {
    return {}
  }
}

/** Marca o pedido como impresso e diz se ELE ainda não tinha sido impresso. */
function claimOrder(orderId) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  const printed = loadPrinted()
  if (printed[orderId] != null) return false
  // Aproveita a escrita pra podar o histórico — 24h cobre qualquer expediente.
  const fresh = { [orderId]: Date.now() }
  for (const [id, ts] of Object.entries(printed)) if (ts > cutoff) fresh[id] = ts
  try {
    localStorage.setItem(PRINTED_KEY, JSON.stringify(fresh))
  } catch {
    // storage cheio/bloqueado: segue e imprime (melhor duplicar que não imprimir)
  }
  return true
}

// ── Execução ──────────────────────────────────────────────────────

export function receiptUrl(orderId, settings, format, auto = false) {
  const qs = new URLSearchParams({ w: String(settings.width), copies: String(settings.copies), format })
  if (auto) qs.set('auto', '1')
  return `/api/orders/${orderId}/receipt?${qs}`
}

function printViaBrowser(orderId, settings) {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    // Fora da tela em vez de display:none — o Chrome não imprime iframe oculto.
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0;border:0;'
    let done = false
    const finish = () => {
      if (done) return
      done = true
      // Espera o diálogo/spool soltar o documento antes de tirar o iframe do DOM.
      setTimeout(() => iframe.remove(), 1500)
      resolve()
    }
    iframe.onload = () => {
      // O próprio documento chama window.print() (auto=1). Só ficamos sabendo
      // que acabou pelo afterprint; o timeout cobre navegador que não dispara.
      try {
        iframe.contentWindow?.addEventListener('afterprint', finish)
      } catch {
        /* sem acesso ao contentWindow: cai no timeout */
      }
      setTimeout(finish, 12_000)
    }
    iframe.onerror = finish
    iframe.src = receiptUrl(orderId, settings, 'html', true)
    document.body.appendChild(iframe)
  })
}

async function printViaRawBt(orderId, settings) {
  const res = await fetch(receiptUrl(orderId, settings, 'escpos'))
  if (!res.ok) throw new Error(`Comanda indisponível (${res.status})`)
  const base64 = await res.text()
  // Âncora em vez de location.href: o esquema rawbt: é tratado pelo app do
  // Android e o painel continua aberto atrás, sem recarregar.
  const a = document.createElement('a')
  a.href = `rawbt:base64,${base64}`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

// Fila: dois pedidos ao mesmo tempo não podem abrir duas janelas de impressão
// simultâneas (o navegador engole a segunda).
let queue = Promise.resolve()

function enqueue(job) {
  queue = queue.then(job, job).catch(() => {})
  return queue
}

/** Imprime a comanda agora, ignorando o modo 'off' e a antiduplicidade. */
export function printReceiptNow(orderId, settings) {
  const mode = settings.mode === 'rawbt' ? 'rawbt' : 'browser'
  return enqueue(() => (mode === 'rawbt' ? printViaRawBt(orderId, settings) : printViaBrowser(orderId, settings)))
}

/**
 * Imprime automaticamente um pedido recém-chegado. Não faz nada se a impressão
 * estiver desligada neste aparelho ou se este pedido já saiu.
 */
export function autoPrintOrder(orderId) {
  const settings = loadPrintSettings()
  if (settings.mode === 'off') return Promise.resolve()
  if (!claimOrder(orderId)) return Promise.resolve()
  return printReceiptNow(orderId, settings)
}
