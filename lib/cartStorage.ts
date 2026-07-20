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
