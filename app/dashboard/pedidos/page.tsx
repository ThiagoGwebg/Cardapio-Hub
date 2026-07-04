import { getCurrentStore } from '@/lib/store'
import { fmtCents } from '@/lib/format'
import KanbanBoard from '@/components/kanban/KanbanBoard'

export default async function PedidosPage() {
  const { supabase, store } = await getCurrentStore()

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, customer_name, customer_phone, subtotal_cents, created_at, order_items(id, product_name_snapshot, quantity)')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  const allOrders = orders ?? []
  const prepCount = allOrders.filter((o) => o.status === 'preparando').length
  const total = allOrders.length
  const faturamento = allOrders
    .filter((o) => o.status !== 'cancelado')
    .reduce((s, o) => s + o.subtotal_cents, 0)

  return (
    <>
      <div className="dash-header">
        <div className="dash-title">Pedidos</div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Pedidos</div>
          <div className="stat-value">{total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Faturamento</div>
          <div className="stat-value">{fmtCents(faturamento)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Em preparo</div>
          <div className="stat-value">{prepCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ticket médio</div>
          <div className="stat-value">{total ? fmtCents(Math.round(faturamento / total)) : 'R$ 0,00'}</div>
        </div>
      </div>

      <KanbanBoard storeId={store.id} orders={allOrders as never} />

      {allOrders.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 20 }}>
          Nenhum pedido ainda. Assim que um cliente pedir pelo cardápio público, ele aparece aqui em tempo real.
        </p>
      )}
    </>
  )
}
