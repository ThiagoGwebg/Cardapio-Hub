'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtCents } from '@/lib/format'
import { IconPin, IconUtensils, IconClose } from '@/components/icons'

type Product = {
  id: string
  name: string
  description: string | null
  price_cents: number
  image_url: string | null
  is_active: boolean
}
type Category = { id: string; name: string; emoji: string | null; products: Product[] }
type Store = {
  id: string
  slug: string
  name: string
  whatsapp_number: string | null
  address: string | null
  min_order_cents: number
  is_open: boolean
  theme: { primaryColor?: string; logoUrl?: string; bannerUrl?: string } | null
}

type CartItem = { id: string; name: string; price_cents: number; qty: number }

export default function PublicMenu({ store, menu }: { store: Store; menu: Category[] }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(menu[0]?.id ?? '')

  const theme = store.theme ?? {}
  const allProducts = useMemo(() => menu.flatMap((c) => c.products), [menu])

  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return menu
    return menu
      .map((cat) => ({
        ...cat,
        products: cat.products.filter((p) => p.name.toLowerCase().includes(q)),
      }))
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
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.id.replace('section-', ''))
          }
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

  const total = cart.reduce((s, i) => s + i.price_cents * i.qty, 0)
  const totalItems = cart.reduce((s, i) => s + i.qty, 0)

  function addToCart(productId: string) {
    const product = allProducts.find((p) => p.id === productId)
    if (!product) return
    setCart((prev) => {
      const existing = prev.find((i) => i.id === productId)
      if (existing) {
        return prev.map((i) => (i.id === productId ? { ...i, qty: i.qty + 1 } : i))
      }
      return [...prev, { id: product.id, name: product.name, price_cents: product.price_cents, qty: 1 }]
    })
  }

  function changeQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.id === productId ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    )
  }

  async function checkout() {
    if (!customerName.trim()) {
      setError('Informe seu nome pra continuar.')
      return
    }
    setSubmitting(true)
    setError(null)

    const supabase = createClient()
    const { data: orderId, error: rpcError } = await supabase.rpc('create_order', {
      p_store_id: store.id,
      p_customer_name: customerName,
      p_customer_phone: customerPhone || null,
      p_customer_note: null,
      p_items: cart.map((i) => ({ product_id: i.id, quantity: i.qty })),
    })

    setSubmitting(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    if (store.whatsapp_number) {
      const lines = cart.map((i) => `• ${i.qty}x ${i.name} = ${fmtCents(i.price_cents * i.qty)}`).join('\n')
      const msg = `Olá! Acabei de fazer o pedido #${String(orderId).slice(0, 8)}:\n\n${lines}\n\n*Total: ${fmtCents(total)}*`
      window.open(`https://wa.me/${store.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
    }

    setDone(true)
    setCart([])
  }

  return (
    <div
      className="storefront"
      style={
        {
          '--primary': theme.primaryColor || undefined,
        } as React.CSSProperties
      }
    >
      <div className="storefront-topbar">
        {theme.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={theme.logoUrl} alt="" style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'cover' }} />
        )}
        <span className="storefront-topbar-name">{store.name}</span>
      </div>

      <div className="cart-overlay" style={{ opacity: cartOpen ? 1 : 0, pointerEvents: cartOpen ? 'all' : 'none' }} onClick={() => setCartOpen(false)} />

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
          </div>
        </div>
      </header>

      <div className="storefront-search-row">
        <input
          className="form-input"
          placeholder="Busque por um produto"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
                  {cat.products.map((p) => {
                    const inCart = cart.find((i) => i.id === p.id)
                    return (
                      <div className="product-card" key={p.id}>
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
                            <div className="product-price">{fmtCents(p.price_cents)}</div>
                            {inCart ? (
                              <div className="qty-controls">
                                <button className="qty-ctrl-btn" onClick={() => changeQty(p.id, -1)}>−</button>
                                <span className="qty-display">{inCart.qty}</span>
                                <button className="qty-ctrl-btn" onClick={() => changeQty(p.id, 1)}>+</button>
                              </div>
                            ) : (
                              <button
                                className="add-btn"
                                disabled={!store.is_open}
                                onClick={() => addToCart(p.id)}
                              >
                                +
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
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
        <div className="cart-drawer-header">
          <h2 className="cart-drawer-title">Seu Pedido</h2>
          <button className="cart-close" onClick={() => setCartOpen(false)}><IconClose /></button>
        </div>

        {done ? (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <p style={{ color: 'var(--green)', fontWeight: 700, marginBottom: 8 }}>Pedido enviado!</p>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>A loja vai confirmar em breve.</p>
          </div>
        ) : cart.length === 0 ? (
          <div className="cart-empty" style={{ display: 'flex' }}>
            <p>Seu carrinho está vazio</p>
          </div>
        ) : (
          <>
            <div className="cart-items" style={{ display: 'flex' }}>
              {cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-unit">{fmtCents(item.price_cents)} / un.</div>
                  </div>
                  <div className="cart-item-controls">
                    <button className="cart-qty-btn" onClick={() => changeQty(item.id, -1)}>−</button>
                    <span className="cart-qty-num">{item.qty}</span>
                    <button className="cart-qty-btn" onClick={() => changeQty(item.id, 1)}>+</button>
                  </div>
                  <span className="cart-item-total">{fmtCents(item.price_cents * item.qty)}</span>
                </div>
              ))}
            </div>
            <div className="cart-footer" style={{ display: 'flex' }}>
              <div className="form-group">
                <input
                  className="form-input"
                  placeholder="Seu nome"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <input
                  className="form-input"
                  placeholder="Telefone (opcional)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
              {error && <p style={{ color: 'var(--red)', fontSize: 12 }}>{error}</p>}
              <div className="cart-minimum">
                {total < store.min_order_cents
                  ? `Faltam ${fmtCents(store.min_order_cents - total)} para o pedido mínimo`
                  : ''}
              </div>
              <div className="cart-subtotal-row">
                <span>Subtotal</span>
                <span className="cart-subtotal-value">{fmtCents(total)}</span>
              </div>
              <button
                className="checkout-btn"
                disabled={total < store.min_order_cents || submitting}
                onClick={checkout}
              >
                {submitting ? 'Enviando...' : 'Fazer Pedido via WhatsApp'}
              </button>
            </div>
          </>
        )}
        </aside>
      </div>

      <button
        className={`cart-fab ${totalItems === 0 ? 'hidden' : ''}`}
        onClick={() => setCartOpen(true)}
      >
        Ver pedido
        <span className="cart-count">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</span>
        <span className="cart-sep">·</span>
        <span className="cart-fab-total">{fmtCents(total)}</span>
      </button>
    </div>
  )
}
