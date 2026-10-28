const PREFIX = 'cardapiohub_cart_'

export function loadCart(storeSlug) {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PREFIX + storeSlug)
    return raw ? (JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function saveCart(storeSlug, cart) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PREFIX + storeSlug, JSON.stringify(cart))
  } catch {
    // localStorage indisponível (modo privado, etc.) — ignora
  }
}

export function clearCart(storeSlug) {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(PREFIX + storeSlug)
  } catch {
    // ignora
  }
}

// ── Dados do cliente ───────────────────────────────────────────────
// Guardados por loja (não globalmente): o endereço de entrega costuma ser o
// mesmo, mas o cliente pode usar apelidos/telefones diferentes em cada loja.
// Só o que ele mesmo digitou — nada é enviado a lugar nenhum sem o pedido.
const CUSTOMER_PREFIX = 'cardapiohub_customer_'


export function loadCustomer(storeSlug) {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CUSTOMER_PREFIX + storeSlug)
    return raw ? (JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function saveCustomer(storeSlug, profile) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CUSTOMER_PREFIX + storeSlug, JSON.stringify(profile))
  } catch {
    // ignora
  }
}
