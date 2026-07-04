'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtCents } from '@/lib/format'
import { advanceOrder } from '@/app/dashboard/pedidos/actions'

type OrderItem = { id: string; product_name_snapshot: string; quantity: number }
type Order = {
  id: string
  status: string
  customer_name: string
  customer_phone: string | null
  subtotal_cents: number
  created_at: string
  order_items: OrderItem[]
}

const COLUMNS = [
  { id: 'novo', label: 'Novos', dot: 'dot-pending', next: 'Iniciar Preparo' },
  { id: 'preparando', label: 'Preparando', dot: 'dot-prep', next: 'Marcar Pronto' },
  { id: 'pronto', label: 'Pronto', dot: 'dot-ready', next: 'Concluir' },
  { id: 'concluido', label: 'Concluídos', dot: 'dot-done', next: null },
]

export default function KanbanBoard({ storeId, orders }: { storeId: string; orders: Order[] }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`orders-${storeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
        () => router.refresh()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [storeId, router])

  return (
    <div className="kanban">
      {COLUMNS.map((col) => {
        const colOrders = orders.filter((o) => o.status === col.id)
        return (
          <div className="kanban-col" key={col.id}>
            <div className="kanban-header">
              <div className="kanban-title">
                <span className={`status-dot ${col.dot}`}></span> {col.label}
              </div>
              <span className="kanban-count">{colOrders.length}</span>
            </div>
            <div className="kanban-body">
              {colOrders.map((order) => (
                <div className="order-card" key={order.id}>
                  <div className="order-card-top">
                    <div className="order-num">#{order.id.slice(0, 8)}</div>
                    <div className="order-time">
                      {new Date(order.created_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className="order-client">{order.customer_name}</div>
                  <div className="order-items">
                    {order.order_items
                      .map((i) => `${i.quantity}x ${i.product_name_snapshot}`)
                      .join(', ')}
                  </div>
                  <div className="order-footer">
                    <div className="order-price">{fmtCents(order.subtotal_cents)}</div>
                  </div>
                  {col.next && (
                    <button
                      className="advance-btn"
                      onClick={() => advanceOrder(order.id, order.status)}
                    >
                      {col.next} →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
