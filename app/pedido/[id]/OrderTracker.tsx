'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtCents, fmtOrderNumber, ORDER_TYPE_LABEL, PAYMENT_LABEL, STATUS_LABEL, PIX_KEY_TYPE_LABEL } from '@/lib/format'
import { saveOrderToHistory } from '@/lib/orderHistory'

type OrderItem = { name: string; quantity: number; unit_price_cents: number; options: string[] }
type Order = {
  id: string
  order_number: number | null
  status: string
  order_type: string
  created_at: string
  customer_name: string
  subtotal_cents: number
  delivery_fee_cents: number
  discount_cents: number
  total_cents: number
  payment_method: string | null
  store_name: string
  store_slug: string
  estimated_prep_min: number
  estimated_delivery_min: number
  pix_key: string | null
  pix_key_type: string | null
  items: OrderItem[]
}

const FLOW_DELIVERY = ['novo', 'preparando', 'pronto', 'a_caminho', 'concluido']
const FLOW_OTHER = ['novo', 'preparando', 'pronto', 'concluido']

export default function OrderTracker({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [pixCopied, setPixCopied] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.rpc('get_order', { p_id: orderId })
    if (data) {
      const o = data as Order
      setOrder(o)
      saveOrderToHistory({ id: o.id, storeSlug: o.store_slug, storeName: o.store_name, createdAt: o.created_at })
    }
    setLoading(false)
  }, [orderId])

  function copyLink() {
    if (typeof window === 'undefined') return
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [load])

  if (loading) return <div className="track-wrap"><p style={{ color: 'var(--muted)' }}>Carregando pedido...</p></div>
  if (!order) return <div className="track-wrap"><p style={{ color: 'var(--muted)' }}>Pedido não encontrado.</p></div>

  const flow = order.order_type === 'delivery' ? FLOW_DELIVERY : FLOW_OTHER
  const canceled = order.status === 'cancelado'
  const currentIdx = flow.indexOf(order.status)
  const eta = order.order_type === 'delivery' ? order.estimated_delivery_min : order.estimated_prep_min

  return (
    <div className="track-wrap">
      <div className="track-card">
        <div className="track-header-row">
          <div>
            <div className="track-store">{order.store_name}</div>
            <div className="track-order-num">Pedido {fmtOrderNumber(order.order_number, order.id)}</div>
          </div>
          <button className="track-copy-btn" onClick={copyLink}>
            {copied ? '✓ Copiado' : '🔗 Salvar link'}
          </button>
        </div>
        <p className="track-copy-hint">Copie e guarde esse link (ou favorite a página) pra acompanhar seu pedido depois.</p>
        <div className="track-badges">
          <span className="track-badge">{ORDER_TYPE_LABEL[order.order_type]}</span>
          {order.payment_method && <span className="track-badge">{PAYMENT_LABEL[order.payment_method]}</span>}
          {!canceled && <span className="track-badge track-badge-eta">⏱ ~{eta} min</span>}
        </div>

        {!canceled && order.payment_method === 'pix' && order.pix_key && (
          <div className="pix-key-box" style={{ marginBottom: 16 }}>
            <span className="pix-key-label">
              Chave Pix da loja{order.pix_key_type ? ` (${PIX_KEY_TYPE_LABEL[order.pix_key_type]})` : ''}
            </span>
            <div className="pix-key-row">
              <span className="pix-key-value">{order.pix_key}</span>
              <button
                className="pix-copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(order.pix_key!)
                  setPixCopied(true)
                  setTimeout(() => setPixCopied(false), 2000)
                }}
              >
                {pixCopied ? '✓' : 'Copiar'}
              </button>
            </div>
            <p className="pix-key-hint">Se ainda não pagou, envie o Pix pra essa chave e mostre o comprovante na retirada/entrega.</p>
          </div>
        )}

        {canceled ? (
          <div className="track-canceled">Este pedido foi cancelado.</div>
        ) : (
          <div className="track-steps">
            {flow.map((s, i) => (
              <div key={s} className={`track-step ${i <= currentIdx ? 'done' : ''} ${i === currentIdx ? 'current' : ''}`}>
                <span className="track-dot" />
                <span className="track-step-label">{STATUS_LABEL[s]}</span>
              </div>
            ))}
          </div>
        )}

        <div className="track-items">
          {order.items.map((it, i) => (
            <div className="track-item" key={i}>
              <span>
                {it.quantity}x {it.name}
                {it.options.length > 0 && <span className="track-item-opts"> · {it.options.join(', ')}</span>}
              </span>
              <span>{fmtCents(it.unit_price_cents * it.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="track-totals">
          <div className="track-total-row"><span>Subtotal</span><span>{fmtCents(order.subtotal_cents)}</span></div>
          {order.delivery_fee_cents > 0 && (
            <div className="track-total-row"><span>Entrega</span><span>{fmtCents(order.delivery_fee_cents)}</span></div>
          )}
          {order.discount_cents > 0 && (
            <div className="track-total-row"><span>Desconto</span><span>- {fmtCents(order.discount_cents)}</span></div>
          )}
          <div className="track-total-row track-total-final"><span>Total</span><span>{fmtCents(order.total_cents)}</span></div>
        </div>

        <a className="track-back" href={`/loja/${order.store_slug}`}>← Voltar ao cardápio</a>
        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
          Ao voltar ao cardápio, toque em <b>&quot;Meus pedidos&quot;</b> no topo pra ver este e outros pedidos feitos neste navegador.
        </p>
      </div>
    </div>
  )
}
