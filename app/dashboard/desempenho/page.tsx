import { getCurrentStore } from '@/lib/store'
import { fmtCents } from '@/lib/format'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default async function DesempenhoPage() {
  const { supabase, store } = await getCurrentStore()

  const since = new Date()
  since.setDate(since.getDate() - 6)
  since.setHours(0, 0, 0, 0)

  const { data: orders } = await supabase
    .from('orders')
    .select('subtotal_cents, created_at, status')
    .eq('store_id', store.id)
    .gte('created_at', since.toISOString())

  const byDay = new Map<string, number>()
  for (let i = 0; i < 7; i++) {
    const d = new Date(since)
    d.setDate(since.getDate() + i)
    byDay.set(d.toDateString(), 0)
  }
  ;(orders ?? [])
    .filter((o) => o.status !== 'cancelado')
    .forEach((o) => {
      const key = new Date(o.created_at).toDateString()
      byDay.set(key, (byDay.get(key) ?? 0) + o.subtotal_cents)
    })

  const week = Array.from(byDay.entries()).map(([dateStr, cents]) => ({
    day: DIAS[new Date(dateStr).getDay()],
    cents,
  }))
  const max = Math.max(1, ...week.map((d) => d.cents))
  const totalFaturamento = week.reduce((s, d) => s + d.cents, 0)
  const totalPedidos = (orders ?? []).filter((o) => o.status !== 'cancelado').length

  return (
    <>
      <div className="dash-header">
        <div className="dash-title">Desempenho</div>
      </div>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Faturamento (7 dias)</div>
          <div className="stat-value">{fmtCents(totalFaturamento)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pedidos no período</div>
          <div className="stat-value">{totalPedidos}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ticket médio</div>
          <div className="stat-value">
            {totalPedidos ? fmtCents(Math.round(totalFaturamento / totalPedidos)) : 'R$ 0,00'}
          </div>
        </div>
      </div>
      <div className="settings-card">
        <div className="settings-section-title">Faturamento — últimos 7 dias</div>
        <div className="bar-chart">
          {week.map((d, i) => (
            <div className="bar-col" key={i}>
              <div className="bar-val">{fmtCents(d.cents)}</div>
              <div className="bar-wrap">
                <div className="bar-fill" style={{ height: `${Math.round((d.cents / max) * 100)}%` }}></div>
              </div>
              <div className="bar-day">{d.day}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
