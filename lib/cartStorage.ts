const PREFIX = 'cardapiohub_cart_'

export function loadCart<T>(storeSlug: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PREFIX + storeSlug)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function saveCart(storeSlug: string, cart: unknown) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PREFIX + storeSlug, JSON.stringify(cart))
  } catch {
    // localStorage indisponível (modo privado, etc.) — ignora
  }
}

export function clearCart(storeSlug: string) {
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

export type CustomerProfile = {
  name?: string
  phone?: string
  address?: {
    cep?: string
    street?: string
    number?: string
    complement?: string
    neighborhood?: string
    reference?: string
  }
}

export function loadCustomer(storeSlug: string): CustomerProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CUSTOMER_PREFIX + storeSlug)
    return raw ? (JSON.parse(raw) as CustomerProfile) : null
  } catch {
    return null
  }
}

export function saveCustomer(storeSlug: string, profile: CustomerProfile) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CUSTOMER_PREFIX + storeSlug, JSON.stringify(profile))
  } catch {
    // ignora
  }
}
