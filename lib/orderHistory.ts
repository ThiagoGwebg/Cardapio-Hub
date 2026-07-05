const KEY = 'cardapioagil_orders'
const MAX = 20

export type OrderHistoryEntry = {
  id: string
  storeSlug: string
  storeName: string
  createdAt: string
}

export function saveOrderToHistory(entry: OrderHistoryEntry) {
  if (typeof window === 'undefined') return
  try {
    const list = getOrderHistory().filter((o) => o.id !== entry.id)
    list.unshift(entry)
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {
    // localStorage indisponível (modo privado, etc.) — ignora
  }
}

export function getOrderHistory(): OrderHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as OrderHistoryEntry[]
  } catch {
    return []
  }
}

export function getOrderHistoryForStore(storeSlug: string): OrderHistoryEntry[] {
  return getOrderHistory().filter((o) => o.storeSlug === storeSlug)
}
