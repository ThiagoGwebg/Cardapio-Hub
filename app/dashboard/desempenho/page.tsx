import Link from 'next/link'
import { getCurrentStore } from '@/lib/store'
import { fmtCents, spDayStart, spDayKey, spHour, spWeekdayShort } from '@/lib/format'
import { isStorePro } from '@/lib/plan'
import { ProLockedSection } from '@/components/dashboard/ProUpsell'

const ORDER_TYPE_LABELS: Record<string, string> = {
  delivery: 'Entrega',
  retirada: 'Retirada',
  pickup: 'Retirada',
  mesa: 'Mesa',
  dine_in: 'Mesa',
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  cash: 'Dinheiro',
  cartao: 'Cartão',
  card: 'Cartão',
}

type OrderRow = {
  subtotal_cents: number
  created_at: string
  status: string
  order_type: string | null
  payment_method: string | null
  order_items: { product_name_snapshot: string; quantity: number }[]
}

function deltaPct(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <div className="stat-sub">sem base de comparação</div>
  const up = delta >= 0
  return (
    <div className="stat-sub">
      <span className={up ? 'stat-up' : 'stat-down'}>
        {up ? '▲' : '▼'} {Math.abs(delta)}%
      </span>{' '}
      vs. período anterior
    </div>
  )
}

function countBy(rows: OrderRow[], key: 'order_type' | 'payment_method', labels: Record<string, string>) {
  const map = new Map<string, number>()
  rows.forEach((o) => {
    const raw = o[key] ?? 'outro'
    const label = labels[raw] ?? raw.charAt(0).toUpperCase() + raw.slice(1)
    map.set(label, (map.get(label) ?? 0) + 1)
  })
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
}

function HBarList({ rows, total }: { rows: [string, number][]; total: number }) {
  return (
    <div className="hbar-list">
      {rows.map(([label, count]) => {
        const pct = total ? Math.round((count / total) * 100) : 0
        return (
          <div className="hbar-row" key={label}>
            <span className="hbar-label">{label}</span>
            <div className="hbar-track">
              <div className="hbar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="hbar-value">{count} · {pct}%</span>
          </div>
        )
      })}
      {rows.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Sem dados no período.</p>}
    </div>
  )
}

/** Prévia estática (dados fictícios) mostrada desfocada para o plano Free. */
function FakeHBars({ labels }: { labels: [string, number][] }) {
  return (
    <div className="hbar-list">
      {labels.map(([label, pct]) => (
        <div className="hbar-row" key={label}>
          <span className="hbar-label">{label}</span>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="hbar-value">{pct}%</span>
        </div>
      ))}
    </div>
  )
}

export default async function DesempenhoPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>
}) {
  const { p } = await searchParams
  const { supabase, store } = await getCurrentStore()
  const isPro = await isStorePro(supabase, store.id)

  const requested = Number(p) || 7
  const period = isPro && [7, 30, 90].includes(requested) ? requested : 7

  // Busca o período atual + o anterior de uma vez para calcular a variação.
  // Limites ancorados no dia de calendário de São Paulo (servidor roda em UTC).
  const now = new Date()
  const since = spDayStart(now, -(period - 1))
  const prevSince = spDayStart(now, -(period * 2 - 1))

  const { data } = await supabase
    .from('orders')
    .select('subtotal_cents, created_at, status, order_type, payment_method, order_items(product_name_snapshot, quantity)')
    .eq('store_id', store.id)
    .gte('created_at', prevSince.toISOString())

  const all = ((data ?? []) as OrderRow[]).filter((o) => o.status !== 'cancelado')
  const current = all.filter((o) => new Date(o.created_at) >= since)
  const previous = all.filter((o) => new Date(o.created_at) < since)

  const faturamento = current.reduce((s, o) => s + o.subtotal_cents, 0)
  const faturamentoPrev = previous.reduce((s, o) => s + o.subtotal_cents, 0)
  const pedidos = current.length
  const pedidosPrev = previous.length
  const ticket = pedidos ? Math.round(faturamento / pedidos) : 0
  const ticketPrev = pedidosPrev ? Math.round(faturamentoPrev / pedidosPrev) : 0

  // Gráfico: diário para 7 dias, semanal para 30/90.
  let chart: { label: string; cents: number }[]
  if (period === 7) {
    // 7 dias de calendário SP a partir de `since` (sem horário de verão, +24h = próxima meia-noite SP).
    const dayInstants = Array.from({ length: 7 }, (_, i) => new Date(since.getTime() + i * 86_400_000))
    const byDay = new Map<string, number>()
    for (const d of dayInstants) byDay.set(spDayKey(d), 0)
    current.forEach((o) => {
      const key = spDayKey(new Date(o.created_at))
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + o.subtotal_cents)
    })
    chart = dayInstants.map((d) => ({ label: spWeekdayShort(d), cents: byDay.get(spDayKey(d)) ?? 0 }))
  } else {
    const weeks = Math.ceil(period / 7)
    const buckets = new Array<number>(weeks).fill(0)
    current.forEach((o) => {
      const diffDays = Math.floor((new Date(o.created_at).getTime() - since.getTime()) / 86_400_000)
      const w = Math.min(weeks - 1, Math.floor(diffDays / 7))
      buckets[w] += o.subtotal_cents
    })
    chart = buckets.map((cents, i) => ({ label: `Sem ${i + 1}`, cents }))
  }
  const max = Math.max(1, ...chart.map((d) => d.cents))

  // Top produtos por quantidade vendida.
  const productQty = new Map<string, number>()
  current.forEach((o) =>
    (o.order_items ?? []).forEach((it) => {
      productQty.set(it.product_name_snapshot, (productQty.get(it.product_name_snapshot) ?? 0) + it.quantity)
    })
  )
  const topProducts = Array.from(productQty.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const topProductsTotal = topProducts.reduce((s, [, q]) => s + q, 0)

  // Horários de pico (pedidos por hora do dia).
  const byHour = new Array<number>(24).fill(0)
  current.forEach((o) => byHour[spHour(new Date(o.created_at))]++)
  const maxHour = Math.max(1, ...byHour)

  const orderTypes = countBy(current, 'order_type', ORDER_TYPE_LABELS)
  const payments = countBy(current, 'payment_method', PAYMENT_LABELS)

  const periodLabel = period === 7 ? '7 dias' : period === 30 ? '30 dias' : '90 dias'

  return (
    <>
      <div className="dash-header">
        <div className="dash-title">Desempenho</div>
        <div className="period-tabs">
          {[7, 30, 90].map((days) => {
            const locked = !isPro && days !== 7
            const active = period === days
            return (
              <Link
                key={days}
                href={locked ? '/dashboard/billing' : `/dashboard/desempenho?p=${days}`}
                className={`period-tab ${active ? 'active' : ''} ${locked ? 'locked' : ''}`}
              >
                {days}d{locked && <span className="pro-badge">Pro</span>}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Faturamento ({periodLabel})</div>
          <div className="stat-value">{fmtCents(faturamento)}</div>
          <DeltaBadge delta={deltaPct(faturamento, faturamentoPrev)} />
        </div>
        <div className="stat-card">
          <div className="stat-label">Pedidos no período</div>
          <div className="stat-value">{pedidos}</div>
          <DeltaBadge delta={deltaPct(pedidos, pedidosPrev)} />
        </div>
        <div className="stat-card">
          <div className="stat-label">Ticket médio</div>
          <div className="stat-value">{ticket ? fmtCents(ticket) : 'R$ 0,00'}</div>
          <DeltaBadge delta={deltaPct(ticket, ticketPrev)} />
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-section-title">Faturamento — últimos {periodLabel}</div>
        <div className="bar-chart">
          {chart.map((d, i) => (
            <div className="bar-col" key={i}>
              <div className="bar-val">{fmtCents(d.cents)}</div>
              <div className="bar-wrap">
                <div className="bar-fill" style={{ height: `${Math.round((d.cents / max) * 100)}%` }}></div>
              </div>
              <div className="bar-day">{d.label}</div>
            </div>
          ))}
        </div>
      </div>

      {isPro ? (
        <>
          <div className="settings-card">
            <div className="settings-section-title">
              Top produtos ({periodLabel}) <span className="pro-badge">Pro</span>
            </div>
            <HBarList rows={topProducts} total={topProductsTotal} />
          </div>

          <div className="settings-card">
            <div className="settings-section-title">
              Horários de pico <span className="pro-badge">Pro</span>
            </div>
            <div className="hour-chart">
              {byHour.map((count, h) => (
                <div className="hour-col" key={h} title={`${h}h — ${count} pedido(s)`}>
                  <div className="hour-wrap">
                    <div className="hour-fill" style={{ height: `${Math.round((count / maxHour) * 100)}%` }} />
                  </div>
                  {h % 3 === 0 && <div className="hour-label">{h}h</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="settings-card">
            <div className="settings-section-title">
              Canais e pagamentos <span className="pro-badge">Pro</span>
            </div>
            <div className="channel-grid">
              <div>
                <div className="channel-title">Tipo de pedido</div>
                <HBarList rows={orderTypes} total={pedidos} />
              </div>
              <div>
                <div className="channel-title">Forma de pagamento</div>
                <HBarList rows={payments} total={pedidos} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <ProLockedSection
            title="Top produtos"
            text="Descubra o que mais vende na sua loja e monte promoções certeiras. Disponível no Pro, com análise de 30 e 90 dias."
          >
            <FakeHBars
              labels={[
                ['Produto campeão', 92],
                ['Segundo mais pedido', 71],
                ['Terceiro lugar', 55],
                ['Quarto lugar', 38],
                ['Quinto lugar', 24],
              ]}
            />
          </ProLockedSection>

          <ProLockedSection
            title="Horários de pico"
            text="Saiba exatamente em que horário seus clientes mais pedem — e prepare a cozinha (e as promoções) para esses momentos."
          >
            <div className="hour-chart">
              {[5, 8, 12, 20, 35, 60, 90, 70, 45, 30, 55, 80].map((v, i) => (
                <div className="hour-col" key={i}>
                  <div className="hour-wrap">
                    <div className="hour-fill" style={{ height: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </ProLockedSection>

          <ProLockedSection
            title="Canais e pagamentos"
            text="Veja quanto vem de entrega, retirada e mesa — e qual forma de pagamento seus clientes preferem."
          >
            <FakeHBars
              labels={[
                ['Entrega', 64],
                ['Retirada', 28],
                ['Mesa', 8],
              ]}
            />
          </ProLockedSection>
        </>
      )}
    </>
  )
}
