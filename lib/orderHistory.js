const KEY = 'cardapiohub_orders'
const MAX = 20


export function saveOrderToHistory(entry) {
  if (typeof window === 'undefined') return
  try {
    const list = getOrderHistory().filter((o) => o.id !== entry.id)
    list.unshift(entry)
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {
    // localStorage indisponível (modo privado, etc.) — ignora
  }
}

export function getOrderHistory() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw);
  } catch {
    return []
  }
}

export function getOrderHistoryForStore(storeSlug) {
  return getOrderHistory().filter((o) => o.storeSlug === storeSlug)
}
