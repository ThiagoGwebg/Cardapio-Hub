import { getCurrentStore } from '@/lib/store'
import { fmtCents, fmtOrderNumber, fmtSince, ORDER_TYPE_LABEL, PAYMENT_LABEL, STATUS_LABEL } from '@/lib/format'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PrintButton from './PrintButton'

const STATUS_DOT: Record<string, string> = {
  novo: 'dot-pending',
  preparando: 'dot-prep',
  pronto: 'dot-ready',
  a_caminho: 'dot-prep',
  concluido: 'dot-done',
  cancelado: 'dot-canceled',
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, store } = await getCurrentStore()

  const { data: order } = await supabase
    .from('orders')
    .select(
      'id, order_number, status, order_type, payment_method, change_for_cents, customer_name, customer_phone, customer_note, subtotal_cents, delivery_fee_cents, discount_cents, total_cents, coupon_code, table_number, address_cep, address_street, address_number, address_complement, address_neighborhood, address_reference, created_at, order_items(id, product_name_snapshot, quantity, unit_price_cents, order_item_options(name_snapshot, group_name_snapshot))'
    )
    .eq('id', id)
    .eq('store_id', store.id)
    .maybeSingle()

  if (!order) notFound()

  const [{ data: history }, { data: custOrders }] = await Promise.all([
    supabase
      .from('order_status_history')
      .select('status, changed_at')
      .eq('order_id', id)
      .order('changed_at', { ascending: false }),
    order.customer_phone
      ? supabase
          .from('orders')
          .select('created_at')
          .eq('store_id', store.id)
          .eq('customer_phone', order.customer_phone)
          .neq('status', 'cancelado')
          .order('created_at', { ascending: true })
      : supabase
          .from('orders')
          .select('created_at')
          .eq('store_id', store.id)
          .eq('customer_name', order.customer_name)
          .neq('status', 'cancelado')
          .order('created_at', { ascending: true }),
  ])

  const custCount = custOrders?.length ?? 1
  const firstOrder = custOrders?.[0]?.created_at

  const address =
    order.order_type === 'delivery' && order.address_street
      ? `${order.address_street}, ${order.address_number || 's/n'}${
          order.address_complement ? ` (${order.address_complement})` : ''
        } — ${order.address_neighborhood || ''}${order.address_cep ? ` · CEP ${order.address_cep}` : ''}`
      : null

  return (
    <div className="order-detail">
      <div className="dash-header no-print">
        <div>
          <Link href="/dashboard/pedidos" style={{ fontSize: 13, color: 'var(--primary)', textDecoration: 'none' }}>
            ← Pedidos
          </Link>
          <div className="dash-title">Pedido {fmtOrderNumber(order.order_number, order.id)}</div>
        </div>
        <PrintButton />
      </div>

      <div className="settings-card print-area">
        {/* Cabeçalho da comanda (aparece na impressão) */}
        <div className="receipt-head">
          <div className="receipt-store">{store.name}</div>
          <div className="receipt-num">
            Pedido {fmtOrderNumber(order.order_number, order.id)} · {fmtDateTime(order.created_at)}
          </div>
        </div>

        <div className="order-tags" style={{ marginBottom: 12 }}>
          <span className={`status-dot ${STATUS_DOT[order.status] ?? ''}`} style={{ marginRight: 4 }} />
          <span className="order-tag">{STATUS_LABEL[order.status]}</span>
          <span className="order-tag">{ORDER_TYPE_LABEL[order.order_type]}</span>
          {order.payment_method && <span className="order-tag">{PAYMENT_LABEL[order.payment_method]}</span>}
        </div>

        {/* Cliente */}
        <div className="receipt-section">
          <div className="receipt-label">Cliente</div>
          <div className="receipt-line" style={{ fontWeight: 600 }}>{order.customer_name || 'Sem nome'}</div>
          {order.customer_phone && <div className="receipt-line">{order.customer_phone}</div>}
          <div className="receipt-line receipt-muted">
            {custCount > 1
              ? `Cliente há ${firstOrder ? fmtSince(firstOrder) : '—'} · ${custCount} pedidos`
              : 'Primeiro pedido deste cliente 🎉'}
          </div>
          {address && <div className="receipt-line">📍 {address}</div>}
          {order.order_type === 'dine_in' && order.table_number && (
            <div className="receipt-line">🍽 Mesa {order.table_number}</div>
          )}
          {order.address_reference && <div className="receipt-line receipt-muted">Ref.: {order.address_reference}</div>}
          {order.customer_note && <div className="receipt-line">📝 {order.customer_note}</div>}
        </div>

        {/* Itens */}
        <div className="receipt-section">
          <div className="receipt-label">Itens</div>
          {order.order_items.map((it) => (
            <div className="receipt-item" key={it.id}>
              <div className="receipt-item-row">
                <span>
                  {it.quantity}x {it.product_name_snapshot}
                </span>
                <span>{fmtCents(it.unit_price_cents * it.quantity)}</span>
              </div>
              {it.order_item_options.length > 0 && (
                <div className="receipt-item-opts">
                  {it.order_item_options.map((o) => o.name_snapshot).join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Totais */}
        <div className="receipt-totals">
          <div className="receipt-total-row">
            <span>Subtotal</span>
            <span>{fmtCents(order.subtotal_cents)}</span>
          </div>
          {order.delivery_fee_cents > 0 && (
            <div className="receipt-total-row">
              <span>Entrega</span>
              <span>{fmtCents(order.delivery_fee_cents)}</span>
            </div>
          )}
          {order.discount_cents > 0 && (
            <div className="receipt-total-row">
              <span>Desconto{order.coupon_code ? ` (${order.coupon_code})` : ''}</span>
              <span>- {fmtCents(order.discount_cents)}</span>
            </div>
          )}
          <div className="receipt-total-row receipt-total-final">
            <span>Total</span>
            <span>{fmtCents(order.total_cents)}</span>
          </div>
          {order.payment_method === 'cash' && order.change_for_cents ? (
            <div className="receipt-total-row receipt-muted">
              <span>Troco para</span>
              <span>
                {fmtCents(order.change_for_cents)} (levar {fmtCents(Math.max(0, order.change_for_cents - order.total_cents))})
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Linha do tempo do status (só na tela) */}
      <div className="settings-card no-print">
        <div className="settings-section-title">Linha do tempo</div>
        <div className="timeline">
          {(history ?? []).map((h, i) => (
            <div className={`timeline-row ${i === 0 ? 'timeline-current' : ''}`} key={i}>
              <span className={`status-dot ${STATUS_DOT[h.status] ?? ''}`} />
              <span className="timeline-status">{STATUS_LABEL[h.status]}</span>
              <span className="timeline-time">{fmtDateTime(h.changed_at)}</span>
            </div>
          ))}
          {(history ?? []).length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Sem histórico registrado.</p>
          )}
        </div>
      </div>
    </div>
  )
}
