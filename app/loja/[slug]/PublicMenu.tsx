'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtCents, PIX_KEY_TYPE_LABEL, friendlyOrderError } from '@/lib/format'
import { googleFontHref, DEFAULT_STORE_FONT } from '@/lib/plan'
import { IconPin, IconUtensils, IconClose, IconSun, IconMoon } from '@/components/icons'
import { saveOrderToHistory, getOrderHistoryForStore, type OrderHistoryEntry } from '@/lib/orderHistory'
import { loadCart, saveCart, clearCart } from '@/lib/cartStorage'
import InstallPwaButton from '@/components/InstallPwaButton'
import './loja.css'

type Option = { id: string; name: string; price_delta_cents: number; image_url?: string | null; description?: string | null }
type Group = {
  id: string
  name: string
  min_select: number
  max_select: number
  required: boolean
  options: Option[]
}
type Product = {
  id: string
  name: string
  description: string | null
  price_cents: number
  image_url: string | null
  images: string[]
  is_active: boolean
  groups: Group[]
}
type Category = { id: string; name: string; emoji: string | null; products: Product[] }
type Zone = { neighborhood: string; fee_cents: number; min_order_cents: number }
type Store = {
  id: string
  slug: string
  name: string
  whatsapp_number: string | null
  address: string | null
  min_order_cents: number
  is_open: boolean
  theme: { primaryColor?: string; logoUrl?: string; bannerUrl?: string; font?: string; announcement?: string } | null
  delivery_enabled: boolean
  pickup_enabled: boolean
  dine_in_enabled: boolean
  delivery_fee_cents: number
  estimated_prep_min: number
  estimated_delivery_min: number
  accepts_cash: boolean
  accepts_card: boolean
  accepts_pix: boolean
  pix_key: string | null
  pix_key_type: string | null
}

type SelectedOption = { option_id: string; name: string; price_delta_cents: number }
type CartItem = {
  lineId: string
  productId: string
  name: string
  base_cents: number
  options: SelectedOption[]
  qty: number
  note?: string
}

type OrderType = 'delivery' | 'pickup' | 'dine_in'
type Payment = 'cash' | 'card' | 'pix'

function unitOf(item: CartItem) {
  return item.base_cents + item.options.reduce((s, o) => s + o.price_delta_cents, 0)
}

export default function PublicMenu({
  store,
  menu,
  zones,
  showBranding = true,
}: {
  store: Store
  menu: Category[]
  zones: Zone[]
  showBranding?: boolean
}) {
  const router = useRouter()
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const saved = localStorage.getItem(`storefront-theme-${store.slug}`)
    if (saved === 'dark' || saved === 'light') {
      setThemeMode(saved)
    } else {
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setThemeMode(isSystemDark ? 'dark' : 'light')
    }
  }, [store.slug])

  const toggleThemeMode = () => {
    const next = themeMode === 'light' ? 'dark' : 'light'
    setThemeMode(next)
    localStorage.setItem(`storefront-theme-${store.slug}`, next)
  }

  const [cart, setCart] = useState<CartItem[]>([])
  const [cartHydrated, setCartHydrated] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [modalProduct, setModalProduct] = useState<Product | null>(null)
  const [modalSel, setModalSel] = useState<Record<string, Option[]>>({})
  const [modalNote, setModalNote] = useState('')
  const [galleryIdx, setGalleryIdx] = useState(0)

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(menu[0]?.id ?? '')
  const [myOrders, setMyOrders] = useState<OrderHistoryEntry[]>([])
  const [myOrdersOpen, setMyOrdersOpen] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMyOrders(getOrderHistoryForStore(store.slug)))
    return () => cancelAnimationFrame(raf)
  }, [store.slug])

  // Recupera o carrinho salvo localmente pra não perder o pedido ao recarregar a página.
  useEffect(() => {
    const saved = loadCart<CartItem[]>(store.slug)
    if (saved && saved.length > 0) setCart(saved)
    setCartHydrated(true)
  }, [store.slug])

  useEffect(() => {
    if (!cartHydrated) return
    saveCart(store.slug, cart)
  }, [store.slug, cart, cartHydrated])

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }

  const enabledTypes = useMemo(() => {
    const t: OrderType[] = []
    if (store.delivery_enabled) t.push('delivery')
    if (store.pickup_enabled) t.push('pickup')
    if (store.dine_in_enabled) t.push('dine_in')
    return t
  }, [store])
  const [orderType, setOrderType] = useState<OrderType>(enabledTypes[0] ?? 'pickup')

  const [addr, setAddr] = useState({ cep: '', street: '', number: '', complement: '', neighborhood: '', reference: '' })
  const [cepManual, setCepManual] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [cepMsg, setCepMsg] = useState<string | null>(null)
  const [tableNumber, setTableNumber] = useState('')

  async function lookupCep(raw: string) {
    const cep = raw.replace(/\D/g, '')
    if (cep.length !== 8) return
    setCepLoading(true)
    setCepMsg(null)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (data.erro) {
        setCepMsg('CEP não encontrado. Preencha o endereço manualmente.')
        setCepManual(true)
        return
      }
      setAddr((a) => {
        let nb = a.neighborhood
        if (zones.length > 0) {
          const match = zones.find(
            (z) => z.neighborhood.trim().toLowerCase() === String(data.bairro || '').trim().toLowerCase()
          )
          if (match) nb = match.neighborhood
        } else {
          nb = data.bairro || a.neighborhood
        }
        return { ...a, cep, street: data.logradouro || a.street, neighborhood: nb }
      })
      if (zones.length > 0 && data.bairro) {
        const match = zones.find(
          (z) => z.neighborhood.trim().toLowerCase() === String(data.bairro).trim().toLowerCase()
        )
        if (!match) setCepMsg(`Seu bairro (${data.bairro}) não está na lista de entrega — selecione um bairro atendido.`)
      }
    } catch {
      setCepMsg('Não deu pra buscar o CEP agora. Preencha manualmente.')
      setCepManual(true)
    } finally {
      setCepLoading(false)
    }
  }
  const [coupon, setCoupon] = useState('')

  const payments = useMemo(() => {
    const p: Payment[] = []
    if (store.accepts_pix) p.push('pix')
    if (store.accepts_cash) p.push('cash')
    if (store.accepts_card) p.push('card')
    return p
  }, [store])
  const [payment, setPayment] = useState<Payment | ''>('')
  const [changeFor, setChangeFor] = useState('')
  const [pixCopied, setPixCopied] = useState(false)

  const theme = store.theme ?? {}
  const storeFont = theme.font && theme.font !== DEFAULT_STORE_FONT ? theme.font : ''
  const styleVars = { '--primary': theme.primaryColor || undefined } as React.CSSProperties
  if (storeFont) (styleVars as Record<string, string>)['--store-font'] = `"${storeFont}"`

  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return menu
    return menu
      .map((cat) => ({ ...cat, products: cat.products.filter((p) => p.name.toLowerCase().includes(q)) }))
      .filter((cat) => cat.products.length > 0)
  }, [menu, search])

  useEffect(() => {
    const sections = menu
      .map((cat) => document.getElementById(`section-${cat.id}`))
      .filter((el): el is HTMLElement => !!el)
    if (sections.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveCategory(entry.target.id.replace('section-', ''))
        })
      },
      { rootMargin: '-30% 0px -60% 0px' }
    )
    sections.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [menu])

  function scrollToSection(id: string) {
    const el = document.getElementById(`section-${id}`)
    if (!el) return
    const offset = el.getBoundingClientRect().top + window.scrollY - 96
    window.scrollTo({ top: offset, behavior: 'smooth' })
  }

  const subtotal = cart.reduce((s, i) => s + unitOf(i) * i.qty, 0)
  const totalItems = cart.reduce((s, i) => s + i.qty, 0)

  const zone = useMemo(
    () => zones.find((z) => z.neighborhood.trim().toLowerCase() === addr.neighborhood.trim().toLowerCase()),
    [zones, addr.neighborhood]
  )
  const deliveryFee = orderType === 'delivery' ? (zone ? zone.fee_cents : store.delivery_fee_cents) : 0
  const total = subtotal + deliveryFee
  const etaMin = orderType === 'delivery' ? store.estimated_delivery_min : store.estimated_prep_min

  // ---- Product modal ----
  function openProduct(p: Product) {
    // Sem complementos e no máximo 1 foto: adiciona direto (1 clique).
    // Com complementos OU com galeria (2+ fotos): abre o modal.
    if (p.groups.length === 0 && p.images.length <= 1) {
      addToCart(p, [], '')
      return
    }
    setGalleryIdx(0)
    setModalProduct(p)
    setModalSel({})
    setModalNote('')
  }

  function toggleOption(group: Group, option: Option) {
    setModalSel((prev) => {
      const cur = prev[group.id] ?? []
      const exists = cur.find((o) => o.id === option.id)
      let next: Option[]
      if (group.max_select === 1) {
        next = exists ? [] : [option]
      } else if (exists) {
        next = cur.filter((o) => o.id !== option.id)
      } else {
        if (group.max_select > 0 && cur.length >= group.max_select) return prev
        next = [...cur, option]
      }
      return { ...prev, [group.id]: next }
    })
  }

  const modalValid = useMemo(() => {
    if (!modalProduct) return false
    return modalProduct.groups.every((g) => {
      const sel = modalSel[g.id] ?? []
      if (g.required && sel.length < Math.max(1, g.min_select)) return false
      if (g.max_select > 0 && sel.length > g.max_select) return false
      return true
    })
  }, [modalProduct, modalSel])

  const modalUnit = useMemo(() => {
    if (!modalProduct) return 0
    const extra = Object.values(modalSel).flat().reduce((s, o) => s + o.price_delta_cents, 0)
    return modalProduct.price_cents + extra
  }, [modalProduct, modalSel])

  function confirmModal() {
    if (!modalProduct || !modalValid) return
    const selected: SelectedOption[] = Object.values(modalSel).flat().map((o) => ({
      option_id: o.id,
      name: o.name,
      price_delta_cents: o.price_delta_cents,
    }))
    addToCart(modalProduct, selected, modalNote)
    setModalProduct(null)
  }

  function addToCart(p: Product, options: SelectedOption[], note: string) {
    const key = p.id + '|' + options.map((o) => o.option_id).sort().join(',') + '|' + note
    setCart((prev) => {
      const existing = prev.find((i) => i.lineId === key)
      if (existing) return prev.map((i) => (i.lineId === key ? { ...i, qty: i.qty + 1 } : i))
      return [...prev, { lineId: key, productId: p.id, name: p.name, base_cents: p.price_cents, options, qty: 1, note }]
    })
    showToast(`${p.name} adicionado ao carrinho`)
  }

  function changeQty(lineId: string, delta: number) {
    const item = cart.find((i) => i.lineId === lineId)
    if (item && delta < 0 && item.qty + delta <= 0) {
      showToast(`${item.name} removido do carrinho`)
    }
    setCart((prev) =>
      prev.map((i) => (i.lineId === lineId ? { ...i, qty: i.qty + delta } : i)).filter((i) => i.qty > 0)
    )
  }

  async function checkout() {
    setError(null)
    if (!customerName.trim()) return setError('Informe seu nome pra continuar.')
    if (orderType === 'delivery' && !addr.neighborhood.trim()) return setError('Informe o bairro de entrega.')
    if (orderType === 'delivery' && !addr.street.trim()) return setError('Informe a rua de entrega.')
    if (orderType === 'dine_in' && !tableNumber.trim()) return setError('Informe o número da mesa.')
    if (payments.length > 0 && !payment) return setError('Escolha a forma de pagamento.')

    setSubmitting(true)
    const supabase = createClient()
    const payload = {
      customer_name: customerName,
      customer_phone: customerPhone || null,
      customer_note: note || null,
      order_type: orderType,
      payment_method: payment || null,
      change_for_cents: payment === 'cash' && changeFor ? Math.round(Number(changeFor) * 100) : null,
      table_number: orderType === 'dine_in' ? tableNumber : null,
      coupon_code: coupon || null,
      address:
        orderType === 'delivery'
          ? {
              cep: addr.cep,
              street: addr.street,
              number: addr.number,
              complement: addr.complement,
              neighborhood: addr.neighborhood,
              reference: addr.reference,
            }
          : null,
      items: cart.map((i) => ({
        product_id: i.productId,
        quantity: i.qty,
        options: i.options.map((o) => ({ option_id: o.option_id })),
        note: i.note || null,
      })),
    }

    const { data: orderId, error: rpcError } = await supabase.rpc('create_order', {
      p_store_id: store.id,
      p_payload: payload,
    })
    setSubmitting(false)
    if (rpcError) {
      if (rpcError.message.includes('limite_pedidos_mes')) {
        return setError('A loja atingiu o limite de pedidos do mês. Tente novamente mais tarde.')
      }
      return setError(friendlyOrderError(rpcError.message))
    }

    saveOrderToHistory({
      id: String(orderId),
      storeSlug: store.slug,
      storeName: store.name,
      createdAt: new Date().toISOString(),
    })

    setCart([])
    clearCart(store.slug)
    router.push(`/pedido/${orderId}`)
  }

  const minToReach = store.min_order_cents - subtotal

  return (
    <div className={`storefront storefront-${themeMode}`} style={styleVars}>
      {/* manifest, theme-color e apple-touch-icon agora vêm do layout.tsx (head real, com as tags de iOS). */}
      {storeFont && <link rel="stylesheet" href={googleFontHref(storeFont)} />}

      <div className="storefront-topbar">
        {theme.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={theme.logoUrl} alt="" style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'cover' }} />
        )}
        <span className="storefront-topbar-name">{store.name}</span>
        <div className="storefront-topbar-actions">
          <InstallPwaButton storeName={store.name} appIconSrc={theme.logoUrl || `/loja/${store.slug}/app-icon.svg`} />
          {myOrders.length > 0 && (
            <button className="my-orders-btn" onClick={() => setMyOrdersOpen(true)}>
              Meus pedidos {myOrders.length > 1 ? `(${myOrders.length})` : ''}
            </button>
          )}
        </div>
      </div>

      {myOrdersOpen && (
        <div className="option-modal-overlay" onClick={() => setMyOrdersOpen(false)}>
          <div className="option-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="option-modal-header">
              <div className="option-modal-title">Meus pedidos</div>
              <button className="cart-close" onClick={() => setMyOrdersOpen(false)}><IconClose /></button>
            </div>
            <div className="option-modal-body">
              {myOrders.map((o) => (
                <a key={o.id} href={`/pedido/${o.id}`} className="my-order-row">
                  <span>Pedido #{o.id.slice(0, 8)}</span>
                  <span className="my-order-date">
                    {new Date(o.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <div
        className="cart-overlay"
        style={{ opacity: cartOpen ? 1 : 0, pointerEvents: cartOpen ? 'all' : 'none' }}
        onClick={() => setCartOpen(false)}
      />

      {theme.bannerUrl && (
        <div className="storefront-banner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={theme.bannerUrl} alt={`Banner ${store.name}`} />
        </div>
      )}

      <header className="storefront-header">
        {theme.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={theme.logoUrl} alt={store.name} className="storefront-logo" />
        ) : (
          <div className="storefront-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
            <IconUtensils size={30} />
          </div>
        )}
        <div className="storefront-info">
          <h1 className="storefront-name">{store.name}</h1>
          <div className="storefront-meta-row">
            <span className={`storefront-status ${store.is_open ? 'is-open' : 'is-closed'}`}>
              <span className="storefront-status-dot" />
              {store.is_open ? 'Aberto agora' : 'Fechado no momento'}
            </span>
            {store.address && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <IconPin size={12} /> {store.address}
              </span>
            )}
            <span>⏱ ~{etaMin} min</span>
          </div>
        </div>
        <button
          onClick={toggleThemeMode}
          className="storefront-theme-toggle"
          aria-label="Alternar tema"
          title={themeMode === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
        >
          {themeMode === 'light' ? <IconMoon size={20} /> : <IconSun size={20} />}
        </button>
      </header>

      {theme.announcement && (
        <div className="storefront-announce">📣 {theme.announcement}</div>
      )}

      {!store.delivery_enabled && (store.pickup_enabled || store.dine_in_enabled) && (
        <div className="storefront-fulfillment">
          🛍️ Esta loja trabalha {store.pickup_enabled ? 'com retirada no local' : 'para consumo no local'} — <b>sem entrega</b>
        </div>
      )}

      <div className="storefront-search-row">
        <input className="form-input" placeholder="Busque por um produto" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="storefront-layout">
        <div className="storefront-main">
          <nav className="menu-nav" style={{ justifyContent: 'flex-start', borderTop: 'none', marginBottom: 20 }}>
            {menu.map((cat) => (
              <span
                key={cat.id}
                className={`menu-nav-item ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => scrollToSection(cat.id)}
                style={{ cursor: 'pointer' }}
              >
                {cat.name}
              </span>
            ))}
          </nav>

          <div className="menu-body" style={{ padding: 0 }}>
            {filteredMenu.map((cat) => (
              <section className="menu-section" id={`section-${cat.id}`} key={cat.id}>
                <div className="section-label">{cat.name}</div>
                <div className="products-grid">
                  {cat.products.map((p) => (
                    <div className="product-card" key={p.id} onClick={() => store.is_open && openProduct(p)} style={{ cursor: store.is_open ? 'pointer' : 'default' }}>
                      <div className="product-img">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt={p.name} />
                        ) : (
                          <span className="p-emoji" style={{ color: 'var(--muted)' }}>
                            <IconUtensils size={36} />
                          </span>
                        )}
                      </div>
                      <div className="product-info">
                        <div className="product-name">{p.name}</div>
                        <div className="product-desc">{p.description}</div>
                        <div className="product-footer">
                          <div className="product-price">
                            {p.groups.length > 0 ? 'a partir de ' : ''}
                            {fmtCents(p.price_cents)}
                          </div>
                          <button className="add-btn" disabled={!store.is_open} onClick={(e) => { e.stopPropagation(); openProduct(p) }}>
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {filteredMenu.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0' }}>
                {search ? 'Nenhum produto encontrado.' : 'Nenhum produto disponível no momento.'}
              </p>
            )}
          </div>
        </div>

        <aside className={`cart-drawer ${cartOpen ? 'open' : ''}`} aria-label="Carrinho">
          <span className="cart-grip" aria-hidden onClick={() => setCartOpen(false)} />
          <div className="cart-drawer-header">
            <h2 className="cart-drawer-title">Seu Pedido</h2>
            <button className="cart-close" onClick={() => setCartOpen(false)}><IconClose /></button>
          </div>

          {cart.length === 0 ? (
            <div className="cart-empty" style={{ display: 'flex' }}>
              <span className="cart-empty-emoji" aria-hidden>🛒</span>
              <p>Seu carrinho está vazio</p>
            </div>
          ) : (
            <>
              <div className="cart-scroll">
              <div className="cart-items" style={{ display: 'flex' }}>
                {cart.map((item) => (
                  <div className="cart-item" key={item.lineId}>
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.name}</div>
                      {item.options.length > 0 && (
                        <div className="cart-item-unit" style={{ fontSize: 11 }}>
                          {item.options.map((o) => o.name).join(', ')}
                        </div>
                      )}
                      {item.note && (
                        <div className="cart-item-unit" style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--primary)' }}>
                          Obs: {item.note}
                        </div>
                      )}
                      <div className="cart-item-unit">{fmtCents(unitOf(item))} / un.</div>
                    </div>
                    <div className="cart-item-controls">
                      <button className="cart-qty-btn" onClick={() => changeQty(item.lineId, -1)}>−</button>
                      <span className="cart-qty-num">{item.qty}</span>
                      <button className="cart-qty-btn" onClick={() => changeQty(item.lineId, 1)}>+</button>
                    </div>
                    <span className="cart-item-total">{fmtCents(unitOf(item) * item.qty)}</span>
                  </div>
                ))}
              </div>

              <div className="cart-form">
                {/* Tipo de pedido */}
                {enabledTypes.length > 1 && (
                  <div className="ordertype-row">
                    {enabledTypes.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`ordertype-btn ${orderType === t ? 'active' : ''}`}
                        onClick={() => setOrderType(t)}
                      >
                        {t === 'delivery' ? 'Entrega' : t === 'pickup' ? 'Retirada' : 'Na mesa'}
                      </button>
                    ))}
                  </div>
                )}

                <div className="form-group">
                  <input className="form-input" placeholder="Seu nome" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div className="form-group">
                  <input className="form-input" placeholder="Telefone (WhatsApp)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                </div>

                {orderType === 'delivery' && (
                  <>
                    {!cepManual ? (
                      <div className="form-group">
                        <input
                          className="form-input"
                          placeholder="CEP"
                          inputMode="numeric"
                          value={addr.cep}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, '').slice(0, 8)
                            setAddr({ ...addr, cep: v })
                            if (v.length === 8) lookupCep(v)
                          }}
                          onBlur={(e) => lookupCep(e.target.value)}
                        />
                        <div className="cep-help">
                          {cepLoading ? (
                            <span style={{ color: 'var(--muted)' }}>Buscando endereço...</span>
                          ) : (
                            <span className="cep-link" onClick={() => { setCepManual(true); setCepMsg(null) }}>
                              Não sei meu CEP
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="cep-help" style={{ marginBottom: 4 }}>
                        <span className="cep-link" onClick={() => setCepManual(false)}>← Buscar por CEP</span>
                      </div>
                    )}
                    {cepMsg && <p style={{ color: 'var(--yellow)', fontSize: 12, marginTop: -4 }}>{cepMsg}</p>}
                    <div className="form-row">
                      <div className="form-group" style={{ flex: 3 }}>
                        <input className="form-input" placeholder="Rua" value={addr.street} onChange={(e) => setAddr({ ...addr, street: e.target.value })} />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <input className="form-input" placeholder="Nº" value={addr.number} onChange={(e) => setAddr({ ...addr, number: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-group">
                      {zones.length > 0 ? (
                        <select className="form-input" value={addr.neighborhood} onChange={(e) => setAddr({ ...addr, neighborhood: e.target.value })}>
                          <option value="">Selecione o bairro</option>
                          {zones.map((z) => (
                            <option key={z.neighborhood} value={z.neighborhood}>
                              {z.neighborhood} — {z.fee_cents ? fmtCents(z.fee_cents) : 'grátis'}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input className="form-input" placeholder="Bairro" value={addr.neighborhood} onChange={(e) => setAddr({ ...addr, neighborhood: e.target.value })} />
                      )}
                    </div>
                    <div className="form-group">
                      <input className="form-input" placeholder="Complemento / referência" value={addr.reference} onChange={(e) => setAddr({ ...addr, reference: e.target.value })} />
                    </div>
                  </>
                )}

                {orderType === 'dine_in' && (
                  <div className="form-group">
                    <input className="form-input" placeholder="Número da mesa" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} />
                  </div>
                )}

                {/* Pagamento */}
                {payments.length > 0 && (
                  <div className="ordertype-row">
                    {payments.map((p) => (
                      <button key={p} type="button" className={`ordertype-btn ${payment === p ? 'active' : ''}`} onClick={() => setPayment(p)}>
                        {p === 'cash' ? 'Dinheiro' : p === 'card' ? 'Cartão' : 'Pix'}
                      </button>
                    ))}
                  </div>
                )}
                {payment === 'cash' && (
                  <div className="form-group">
                    <input className="form-input" type="number" step="0.01" placeholder="Troco para quanto? (opcional)" value={changeFor} onChange={(e) => setChangeFor(e.target.value)} />
                  </div>
                )}
                {payment === 'pix' && store.pix_key && (
                  <div className="pix-key-box">
                    <span className="pix-key-label">
                      Chave Pix da loja{store.pix_key_type ? ` (${PIX_KEY_TYPE_LABEL[store.pix_key_type]})` : ''}
                    </span>
                    <div className="pix-key-row">
                      <span className="pix-key-value">{store.pix_key}</span>
                      <button
                        type="button"
                        className="pix-copy-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(store.pix_key!)
                          setPixCopied(true)
                          setTimeout(() => setPixCopied(false), 2000)
                        }}
                      >
                        {pixCopied ? '✓' : 'Copiar'}
                      </button>
                    </div>
                    <p className="pix-key-hint">Pague com essa chave e confirme o pedido. O comprovante pode ser confirmado direto com a loja.</p>
                  </div>
                )}

                <div className="form-group">
                  <input className="form-input" placeholder="Cupom (opcional)" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} />
                </div>
                <div className="form-group">
                  <input className="form-input" placeholder="Observação (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
                </div>

                {error && <p className="cart-error">{error}</p>}

                <div className="cart-summary">
                  <div className="cart-sum-row">
                    <span>Subtotal</span>
                    <span>{fmtCents(subtotal)}</span>
                  </div>
                  {orderType === 'delivery' && (
                    <div className="cart-sum-row">
                      <span>Entrega{zone ? ` (${zone.neighborhood})` : ''}</span>
                      <span>{deliveryFee ? fmtCents(deliveryFee) : 'Grátis'}</span>
                    </div>
                  )}
                </div>
              </div>{/* /cart-form */}
              </div>{/* /cart-scroll */}

              <div className="cart-action-bar">
                {minToReach > 0 && (
                  <div className="cart-minimum">Faltam {fmtCents(minToReach)} para o pedido mínimo</div>
                )}
                <div className="cart-action-inner">
                  <div className="cart-action-total">
                    <span className="cart-action-total-label">Total</span>
                    <span className="cart-action-total-value">{fmtCents(total)}</span>
                  </div>
                  <button
                    className="checkout-btn"
                    disabled={subtotal < store.min_order_cents || submitting}
                    onClick={checkout}
                  >
                    {submitting ? 'Enviando...' : 'Confirmar Pedido'}
                  </button>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Modal de complementos */}
      {modalProduct && (
        <div className="option-modal-overlay" onClick={() => setModalProduct(null)}>
          <div className="option-modal" onClick={(e) => e.stopPropagation()}>
            <div className="option-modal-left">
              {modalProduct.images.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={modalProduct.images[galleryIdx] ?? modalProduct.images[0]} alt={modalProduct.name} />
              ) : modalProduct.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={modalProduct.image_url} alt={modalProduct.name} />
              ) : (
                <div style={{ padding: 40, color: 'var(--muted)' }}><IconUtensils size={60} /></div>
              )}
            </div>
            <div className="option-modal-right">
              <div className="option-modal-header">
                <div>
                  <div className="option-modal-title">{modalProduct.name}</div>
                  <div style={{ color: 'var(--primary)', fontWeight: 800, marginTop: 4 }}>
                    {fmtCents(modalProduct.price_cents)}
                  </div>
                  {modalProduct.description && <div className="option-modal-desc" style={{ marginTop: 8 }}>{modalProduct.description}</div>}
                </div>
                <button className="cart-close" onClick={() => setModalProduct(null)}><IconClose /></button>
              </div>
              <div className="option-modal-body">
                {modalProduct.groups.map((g) => {
                  const sel = modalSel[g.id] ?? []
                  return (
                    <div className="option-group" key={g.id}>
                      <div className="option-group-head">
                        <span className="option-group-name">{g.name}</span>
                        <span className={`option-group-tag ${g.required ? 'req' : ''}`}>
                          {g.required ? 'Obrigatório' : 'Opcional'}
                          {g.max_select > 1 ? ` · até ${g.max_select}` : ''}
                        </span>
                      </div>
                      {g.options.map((o) => {
                        const checked = !!sel.find((x) => x.id === o.id)
                        return (
                          <label className="option-row" key={o.id}>
                            {o.image_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img className="option-row-thumb" src={o.image_url} alt={o.name} />
                            )}
                            <span className="option-row-main">
                              <span className="option-row-name">{o.name}</span>
                              {o.description && <span className="option-row-desc">{o.description}</span>}
                            </span>
                            <span className="option-row-right">
                              {o.price_delta_cents > 0 && <span className="option-row-price">+ {fmtCents(o.price_delta_cents)}</span>}
                              <input
                                type={g.max_select === 1 ? 'radio' : 'checkbox'}
                                name={g.id}
                                checked={checked}
                                onChange={() => toggleOption(g, o)}
                              />
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  )
                })}
                <div className="option-group">
                   <div className="option-group-head">
                      <span className="option-group-name">Alguma observação?</span>
                      <span className="option-group-tag" style={{ color: 'var(--muted)' }}>{modalNote.length} / 140</span>
                   </div>
                   <div style={{ padding: '0 16px 16px', background: 'var(--surface)' }}>
                     <textarea 
                       className="form-input" 
                       rows={2} 
                       maxLength={140}
                       placeholder="Ex: Tirar cebola, maionese à parte..."
                       value={modalNote}
                       onChange={(e) => setModalNote(e.target.value)}
                       style={{ resize: 'none' }}
                     />
                   </div>
                </div>
              </div>
              <div className="option-modal-footer">
                <button className="checkout-btn" disabled={!modalValid} onClick={confirmModal}>
                  Adicionar · {fmtCents(modalUnit)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBranding && (
        <footer className="storefront-branding">
          <a href="/" target="_blank" rel="noopener">
            Feito com <strong>cardápio<span>ágil</span></strong>
          </a>
        </footer>
      )}

      <button className={`cart-fab ${totalItems === 0 ? 'hidden' : ''}`} onClick={() => setCartOpen(true)}>
        <span className="fab-left">
          <span className="fab-count">{totalItems}</span>
          <span className="fab-total-block">
            <span className="fab-total-label">Total</span>
            <span className="cart-fab-total">{fmtCents(total)}</span>
          </span>
        </span>
        <span className="fab-right">
          Ver pedido
          <span className="cart-count">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</span>
        </span>
      </button>

      {toast && (
        <div className="storefront-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
