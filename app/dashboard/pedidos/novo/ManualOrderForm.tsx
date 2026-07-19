'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fmtCents } from '@/lib/format'
import { IconUtensils } from '@/components/icons'
import { createManualOrder } from '../actions'

type Option = { id: string; name: string; price_delta_cents: number; image_url: string | null; description: string | null }
type Group = { id: string; name: string; min_select: number; max_select: number; required: boolean; options: Option[] }
type Product = { id: string; name: string; price_cents: number; image_url: string | null; groups: Group[] }
type Category = { id: string; name: string; emoji: string | null; products: Product[] }

type SelectedOption = { option_id: string; name: string; price_delta_cents: number }
type CartItem = {
  lineId: string
  productId: string
  name: string
  base_cents: number
  options: SelectedOption[]
  qty: number
}

type OrderType = 'pickup' | 'dine_in'
type Payment = 'cash' | 'card' | 'pix'

function unitOf(item: CartItem) {
  return item.base_cents + item.options.reduce((s, o) => s + o.price_delta_cents, 0)
}

export default function ManualOrderForm({ menu, disabled = false }: { menu: Category[]; disabled?: boolean }) {
  const router = useRouter()

  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')

  // Produto com complementos expandido inline (em vez do modal do cardápio público)
  const [openProductId, setOpenProductId] = useState<string | null>(null)
  const [openSel, setOpenSel] = useState<Record<string, Option[]>>({})

  const [orderType, setOrderType] = useState<OrderType>('pickup')
  const [tableNumber, setTableNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [note, setNote] = useState('')
  const [payment, setPayment] = useState<Payment | ''>('')
  const [markDone, setMarkDone] = useState(false)
  const [scheduleOn, setScheduleOn] = useState(false)
  const [scheduledFor, setScheduledFor] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return menu
    return menu
      .map((cat) => ({ ...cat, products: cat.products.filter((p) => p.name.toLowerCase().includes(q)) }))
      .filter((cat) => cat.products.length > 0)
  }, [menu, search])

  const subtotal = cart.reduce((s, i) => s + unitOf(i) * i.qty, 0)
  const totalItems = cart.reduce((s, i) => s + i.qty, 0)

  function addToCart(p: Product, options: SelectedOption[]) {
    const key = p.id + '|' + options.map((o) => o.option_id).sort().join(',')
    setCart((prev) => {
      const found = prev.find((i) => i.lineId === key)
      if (found) return prev.map((i) => (i.lineId === key ? { ...i, qty: i.qty + 1 } : i))
      return [...prev, { lineId: key, productId: p.id, name: p.name, base_cents: p.price_cents, options, qty: 1 }]
    })
  }

  function changeQty(lineId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.lineId === lineId ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    )
  }

  function clickProduct(p: Product) {
    if (p.groups.length === 0) {
      addToCart(p, [])
      return
    }
    setOpenSel({})
    setOpenProductId((cur) => (cur === p.id ? null : p.id))
  }

  function toggleOption(group: Group, option: Option) {
    setOpenSel((prev) => {
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

  const openProduct = useMemo(() => {
    for (const cat of menu) {
      const p = cat.products.find((x) => x.id === openProductId)
      if (p) return p
    }
    return null
  }, [menu, openProductId])

  const openValid = useMemo(() => {
    if (!openProduct) return false
    return openProduct.groups.every((g) => {
      const sel = openSel[g.id] ?? []
      if (g.required && sel.length < Math.max(1, g.min_select)) return false
      if (g.max_select > 0 && sel.length > g.max_select) return false
      return true
    })
  }, [openProduct, openSel])

  const openUnit = useMemo(() => {
    if (!openProduct) return 0
    const extra = Object.values(openSel).flat().reduce((s, o) => s + o.price_delta_cents, 0)
    return openProduct.price_cents + extra
  }, [openProduct, openSel])

  function confirmOpenProduct() {
    if (!openProduct || !openValid) return
    const selected: SelectedOption[] = Object.values(openSel).flat().map((o) => ({
      option_id: o.id,
      name: o.name,
      price_delta_cents: o.price_delta_cents,
    }))
    addToCart(openProduct, selected)
    setOpenProductId(null)
    setOpenSel({})
  }

  async function submit() {
    setError(null)
    if (cart.length === 0) return setError('Adicione ao menos um item ao pedido.')
    if (orderType === 'dine_in' && !tableNumber.trim()) return setError('Informe o número da mesa.')
    if (scheduleOn) {
      if (!scheduledFor) return setError('Informe a data e o horário do agendamento.')
      if (new Date(scheduledFor).getTime() < Date.now() - 5 * 60_000) {
        return setError('O horário do agendamento já passou.')
      }
    }

    setSubmitting(true)
    const { error: err } = await createManualOrder({
      order_type: orderType,
      status: markDone && !scheduleOn ? 'concluido' : 'novo',
      payment_method: payment || null,
      customer_name: customerName.trim() || null,
      customer_phone: customerPhone.trim() || null,
      customer_note: note.trim() || null,
      table_number: orderType === 'dine_in' ? tableNumber.trim() : null,
      scheduled_for: scheduleOn && scheduledFor ? new Date(scheduledFor).toISOString() : null,
      items: cart.map((i) => ({
        product_id: i.productId,
        quantity: i.qty,
        options: i.options.map((o) => ({ option_id: o.option_id })),
      })),
    })
    setSubmitting(false)
    if (err) return setError(err)
    router.push('/dashboard/pedidos')
  }

  return (
    <div className="mo-grid">
      <div className="settings-card">
        <div className="settings-section-title">Produtos</div>
        <div className="form-group">
          <input
            className="form-input"
            placeholder="Buscar produto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="mo-prod-list">
          {filteredMenu.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>Nenhum produto encontrado.</p>
          )}
          {filteredMenu.map((cat) => (
            <div key={cat.id}>
              <div className="mo-cat-title">
                {cat.emoji ? `${cat.emoji} ` : ''}
                {cat.name}
              </div>
              {cat.products.map((p) => (
                <div key={p.id}>
                  <button type="button" className="mo-prod-row" onClick={() => clickProduct(p)}>
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="mo-prod-thumb" src={p.image_url} alt={p.name} />
                    ) : (
                      <span className="mo-prod-thumb mo-prod-thumb--empty">
                        <IconUtensils size={16} />
                      </span>
                    )}
                    <span className="mo-prod-name">{p.name}</span>
                    <span className="mo-prod-price">{fmtCents(p.price_cents)}</span>
                    <span className="mo-prod-add" aria-hidden>
                      {openProductId === p.id ? '−' : '+'}
                    </span>
                  </button>

                  {openProductId === p.id && (
                    <div className="mo-opts">
                      {p.groups.map((g) => (
                        <div key={g.id} className="mo-opt-group">
                          <div className="mo-opt-group-title">
                            {g.name}
                            <span className="mo-opt-group-rule">
                              {g.required ? ' · obrigatório' : ''}
                              {g.max_select > 0 ? ` · até ${g.max_select}` : ''}
                            </span>
                          </div>
                          {g.options.map((o) => {
                            const checked = (openSel[g.id] ?? []).some((x) => x.id === o.id)
                            return (
                              <label key={o.id} className="mo-opt-row">
                                <input
                                  type={g.max_select === 1 ? 'radio' : 'checkbox'}
                                  checked={checked}
                                  onChange={() => toggleOption(g, o)}
                                  name={`grp-${g.id}`}
                                />
                                {o.image_url && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img className="mo-opt-thumb" src={o.image_url} alt={o.name} />
                                )}
                                <span className="mo-opt-main">
                                  <span className="mo-opt-name">{o.name}</span>
                                  {o.description && <span className="mo-opt-desc">{o.description}</span>}
                                </span>
                                {o.price_delta_cents !== 0 && (
                                  <span className="mo-opt-price">+{fmtCents(o.price_delta_cents)}</span>
                                )}
                              </label>
                            )
                          })}
                        </div>
                      ))}
                      <button type="button" className="save-btn" disabled={!openValid} onClick={confirmOpenProduct}>
                        Adicionar — {fmtCents(openUnit)}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="settings-card">
          <div className="settings-section-title">Itens do pedido</div>
          {cart.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhum item ainda. Toque em um produto para adicionar.</p>
          ) : (
            <>
              {cart.map((i) => (
                <div key={i.lineId} className="mo-cart-row">
                  <div className="mo-cart-info">
                    <div className="mo-cart-name">{i.name}</div>
                    {i.options.length > 0 && (
                      <div className="mo-cart-opts">{i.options.map((o) => o.name).join(', ')}</div>
                    )}
                  </div>
                  <div className="mo-cart-qty">
                    <button type="button" className="mo-qty-btn" onClick={() => changeQty(i.lineId, -1)}>−</button>
                    <span>{i.qty}</span>
                    <button type="button" className="mo-qty-btn" onClick={() => changeQty(i.lineId, +1)}>+</button>
                  </div>
                  <div className="mo-cart-price">{fmtCents(unitOf(i) * i.qty)}</div>
                </div>
              ))}
              <div className="mo-subtotal">
                <span>
                  Subtotal · {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                </span>
                <b>{fmtCents(subtotal)}</b>
              </div>
            </>
          )}
        </div>

        <div className="settings-card">
          <div className="settings-section-title">Detalhes</div>

          <div className="form-group">
            <label className="form-label">Tipo</label>
            <div className="ordertype-row">
              <button
                type="button"
                className={`ordertype-btn ${orderType === 'pickup' ? 'active' : ''}`}
                onClick={() => setOrderType('pickup')}
              >
                Balcão
              </button>
              <button
                type="button"
                className={`ordertype-btn ${orderType === 'dine_in' ? 'active' : ''}`}
                onClick={() => setOrderType('dine_in')}
              >
                Mesa
              </button>
            </div>
          </div>

          {orderType === 'dine_in' && (
            <div className="form-group">
              <label className="form-label">Número da mesa</label>
              <input className="form-input" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder="Ex.: 4" />
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome do cliente (opcional)</label>
              <input className="form-input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ex.: João" />
            </div>
            <div className="form-group">
              <label className="form-label">WhatsApp (opcional)</label>
              <input className="form-input" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Pagamento (opcional)</label>
            <div className="ordertype-row">
              {(['pix', 'cash', 'card'] as Payment[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`ordertype-btn ${payment === p ? 'active' : ''}`}
                  onClick={() => setPayment((cur) => (cur === p ? '' : p))}
                >
                  {p === 'pix' ? 'Pix' : p === 'cash' ? 'Dinheiro' : 'Cartão'}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Observação (opcional)</label>
            <input className="form-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: sem cebola" />
          </div>

          <label className="mo-done-check" style={{ marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={scheduleOn}
              onChange={(e) => {
                setScheduleOn(e.target.checked)
                if (e.target.checked) setMarkDone(false)
              }}
            />
            <span>
              📅 <b>Agendar</b> este pedido (encomenda para data/hora combinada)
            </span>
          </label>

          {scheduleOn && (
            <div className="form-group">
              <label className="form-label">Data e horário combinados</label>
              <input
                type="datetime-local"
                className="form-input"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
            </div>
          )}

          {!scheduleOn && (
            <label className="mo-done-check">
              <input type="checkbox" checked={markDone} onChange={(e) => setMarkDone(e.target.checked)} />
              <span>
                Registrar como <b>concluído</b> (venda já entregue — não entra no preparo)
              </span>
            </label>
          )}
        </div>

        {error && <div className="mo-error">{error}</div>}

        <button type="button" className="save-btn mo-submit" disabled={submitting || disabled || cart.length === 0} onClick={submit}>
          {submitting ? 'Registrando…' : `Registrar pedido${subtotal > 0 ? ` — ${fmtCents(subtotal)}` : ''}`}
        </button>
      </div>
    </div>
  )
}
