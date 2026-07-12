import Link from 'next/link'
import { getCurrentStore } from '@/lib/store'
import { fmtCents, spDayStart, SP_TZ } from '@/lib/format'
import { isStorePro } from '@/lib/plan'
import ExportCsvButton from './ExportCsvButton'

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  cash: 'Dinheiro',
  cartao: 'Cartão',
  card: 'Cartão',
}

export default async function CaixaPage() {
  const { supabase, store } = await getCurrentStore()
  const isPro = await isStorePro(supabase, store.id)

  // Dia do caixa = dia de calendário em São Paulo (o servidor roda em UTC).
  const startOfDay = spDayStart(new Date(), 0)

  const { data: orders } = await supabase
    .from('orders')
    .select('id, customer_name, subtotal_cents, status, payment_method, created_at')
    .eq('store_id', store.id)
    .gte('created_at', startOfDay.toISOString())
    .neq('status', 'cancelado')
    .order('created_at', { ascending: false })

  const rows = orders ?? []
  const total = rows.reduce((s, o) => s + o.subtotal_cents, 0)

  const byPayment = new Map<string, number>()
  rows.forEach((o) => {
    const label = PAYMENT_LABELS[o.payment_method ?? ''] ?? 'Outro'
    byPayment.set(label, (byPayment.get(label) ?? 0) + o.subtotal_cents)
  })

  const csvRows = rows.map((o) => ({
    pedido: `#${o.id.slice(0, 8)}`,
    cliente: o.customer_name,
    status: o.status,
    pagamento: PAYMENT_LABELS[o.payment_method ?? ''] ?? o.payment_method ?? '',
    valor: (o.subtotal_cents / 100).toFixed(2).replace('.', ','),
    horario: new Date(o.created_at).toLocaleTimeString('pt-BR', { timeZone: SP_TZ, hour: '2-digit', minute: '2-digit' }),
  }))

  return (
    <>
      <div className="dash-header">
        <div className="dash-title">Caixa</div>
      </div>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Entradas hoje</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{fmtCents(total)}</div>
          <div className="stat-sub">{rows.length} pedidos</div>
        </div>
        {Array.from(byPayment.entries()).map(([label, cents]) => (
          <div className="stat-card" key={label}>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{fmtCents(cents)}</div>
            <div className="stat-sub">{total ? Math.round((cents / total) * 100) : 0}% do dia</div>
          </div>
        ))}
      </div>
      <div className="history-table">
        <div className="history-header">
          <div className="history-title">Movimentações de hoje</div>
          {isPro ? (
            <ExportCsvButton
              rows={csvRows}
              filename={`caixa-${new Date().toLocaleDateString('en-CA', { timeZone: SP_TZ })}.csv`}
            />
          ) : (
            <Link href="/dashboard/billing" className="ordertype-btn export-locked" style={{ flex: 'none', padding: '6px 14px', textDecoration: 'none' }}>
              Exportar CSV <span className="pro-badge">Pro</span>
            </Link>
          )}
        </div>
        <table>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Pagamento</th>
              <th>Status</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td className="td-num">#{o.id.slice(0, 8)}</td>
                <td>{o.customer_name}</td>
                <td>{PAYMENT_LABELS[o.payment_method ?? ''] ?? o.payment_method ?? '—'}</td>
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
