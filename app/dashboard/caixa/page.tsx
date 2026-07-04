import { getCurrentStore } from '@/lib/store'
import { fmtCents } from '@/lib/format'

export default async function CaixaPage() {
  const { supabase, store } = await getCurrentStore()

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { data: orders } = await supabase
    .from('orders')
    .select('id, customer_name, subtotal_cents, status, created_at')
    .eq('store_id', store.id)
    .gte('created_at', startOfDay.toISOString())
    .neq('status', 'cancelado')
    .order('created_at', { ascending: false })

  const total = (orders ?? []).reduce((s, o) => s + o.subtotal_cents, 0)

  return (
    <>
      <div className="dash-header">
        <div className="dash-title">Caixa</div>
      </div>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Entradas hoje</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{fmtCents(total)}</div>
          <div className="stat-sub">{(orders ?? []).length} pedidos</div>
        </div>
      </div>
      <div className="history-table">
        <div className="history-header">
          <div className="history-title">Movimentações de hoje</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Status</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id}>
                <td className="td-num">#{o.id.slice(0, 8)}</td>
                <td>{o.customer_name}</td>
                <td><span className="status-pill pill-done">{o.status}</span></td>
                <td className="td-price">{fmtCents(o.subtotal_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
