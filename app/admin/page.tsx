import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLAN_LIMITS } from '@/lib/stripe/plans'
import { fmtCents, fmtOrderNumber, spDayKey, spMonthStart, SP_TZ, ORDER_TYPE_LABEL, STATUS_LABEL } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Admin — CardápioÁgil',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

const DAY_MS = 86_400_000
const CHART_DAYS = 14

function fmtWhen(iso: string, now: Date) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('pt-BR', { timeZone: SP_TZ, hour: '2-digit', minute: '2-digit' })
  const key = spDayKey(d)
  if (key === spDayKey(now)) return `hoje ${time}`
  if (key === spDayKey(new Date(now.getTime() - DAY_MS))) return `ontem ${time}`
  // Fora dos últimos 2 dias: mostra a data (com ano se não for o corrente).
  const opts: Intl.DateTimeFormatOptions =
    d.getFullYear() === now.getFullYear()
      ? { timeZone: SP_TZ, day: '2-digit', month: '2-digit' }
      : { timeZone: SP_TZ, day: '2-digit', month: '2-digit', year: '2-digit' }
  return `${d.toLocaleDateString('pt-BR', opts)} ${time}`
}

// GMV: pedidos antigos podem ter total_cents = 0 (coluna nasceu depois); cai no subtotal.
function orderValue(o: { total_cents: number | null; subtotal_cents: number | null }) {
  return o.total_cents || o.subtotal_cents || 0
}

function fmtMoneyRound(cents: number) {
  return 'R$ ' + Math.round(cents / 100).toLocaleString('pt-BR')
}

type Overview = {
  orders_month: number
  gmv_month: number
  orders_prev: number
  orders_by_store: Record<string, number>
  daily: Record<string, number>
}

type StoreRel = { name: string; slug: string } | { name: string; slug: string }[] | null

type FeedOrder = {
  id: string
  order_number: number | null
  customer_name: string
  total_cents: number | null
  subtotal_cents: number | null
  status: string
  order_type: string
  created_at: string
  stores: StoreRel
}

function storeOf(rel: StoreRel) {
  return Array.isArray(rel) ? rel[0] : rel
}

export default async function AdminHomePage() {
  await requireAdmin()
  const supabase = createAdminClient()

  const now = new Date()
  const monthStart = spMonthStart(now, 0)
  const prevMonthStart = spMonthStart(now, -1)
  // "Mesmo ponto do mês passado" = mesmo tempo decorrido desde o início do mês,
  // travado no fim do mês anterior pra nunca invadir o mês atual (dias 29-31).
  const elapsed = now.getTime() - monthStart.getTime()
  const prevSamePoint = new Date(Math.min(prevMonthStart.getTime() + elapsed, monthStart.getTime()))
  // 1 dia de folga: o gráfico mostra 14 dias, mas cobrimos 15 pra não perder o dia
  // mais antigo por causa da diferença UTC↔SP no limite inferior.
  const chartStart = new Date(now.getTime() - (CHART_DAYS + 1) * DAY_MS)

  const [overviewRes, leadsRes, storesRes, subsRes, feedRes, recentLeadsRes] = await Promise.all([
    supabase.rpc('admin_overview', {
      p_month_start: monthStart.toISOString(),
      p_prev_start: prevMonthStart.toISOString(),
      p_prev_end: prevSamePoint.toISOString(),
      p_chart_start: chartStart.toISOString(),
    }),
    supabase.from('leads').select('status'),
    supabase.from('stores').select('id, name, slug, created_at'),
    supabase.from('subscriptions').select('store_id, plan, status'),
    supabase
      .from('orders')
      .select('id, order_number, customer_name, total_cents, subtotal_cents, status, order_type, created_at, stores(name, slug)')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('leads')
      .select('id, name, company, created_at')
      .eq('status', 'novo')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const ov = (overviewRes.data as Overview | null) ?? {
    orders_month: 0,
    gmv_month: 0,
    orders_prev: 0,
    orders_by_store: {},
    daily: {},
  }

  // ── Leads ─────────────────────────────────────────────────
  const leads = leadsRes.data || []
  const leadCounts = {
    novo: leads.filter((l) => l.status === 'novo').length,
    fechado: leads.filter((l) => l.status === 'fechado').length,
    total: leads.length,
  }
  const conversion = leadCounts.total > 0 ? Math.round((leadCounts.fechado / leadCounts.total) * 100) : 0
  const recentLeads = recentLeadsRes.data || []

  // ── Pedidos e dinheiro (agregados no servidor) ────────────
  const ordersMonth = ov.orders_month
  const gmvMonth = ov.gmv_month
  const avgTicket = ordersMonth > 0 ? Math.round(gmvMonth / ordersMonth) : 0
  const prevOrders = ov.orders_prev
  const ordersDelta = prevOrders > 0 ? Math.round(((ordersMonth - prevOrders) / prevOrders) * 100) : null

  // ── Série diária (últimos 14 dias, bucketizada por dia SP no banco) ──
  const byDay = ov.daily
  const days = Array.from({ length: CHART_DAYS }, (_, i) => {
    const d = new Date(now.getTime() - (CHART_DAYS - 1 - i) * DAY_MS)
    const key = spDayKey(d)
    return {
      key,
      dayNum: key.slice(0, 2),
      weekday: d.toLocaleDateString('pt-BR', { timeZone: SP_TZ, weekday: 'short' }).replace('.', ''),
      count: byDay[key] || 0,
    }
  })
  const maxDay = Math.max(1, ...days.map((d) => d.count))
  const chartTotal = days.reduce((s, d) => s + d.count, 0)

  // ── Lojas, planos e radar de upgrade ──────────────────────
  const stores = storesRes.data || []
  const proStoreIds = new Set(
    (subsRes.data || []).filter((s) => s.plan === 'pro' && s.status === 'active').map((s) => s.store_id)
  )
  const proCount = proStoreIds.size
  const newStoresMonth = stores.filter((s) => new Date(s.created_at) >= monthStart).length

  const ordersByStore = ov.orders_by_store
  const freeLimit = PLAN_LIMITS.free.maxOrdersPerMonth
  const radar = stores
    .filter((s) => !proStoreIds.has(s.id))
    .map((s) => {
      const orders = ordersByStore[s.id] || 0
      return { ...s, orders, pct: Math.min(100, Math.round((orders / freeLimit) * 100)) }
    })
    .filter((s) => s.orders > 0)
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 5)

  const feed = (feedRes.data || []) as FeedOrder[]

  return (
    <main className="adm-page">
      <h1 className="adm-title">Visão geral</h1>
      <p className="adm-subtitle">
        {now.toLocaleDateString('pt-BR', { timeZone: SP_TZ, weekday: 'long', day: 'numeric', month: 'long' })} · o
        pulso do CardápioÁgil num lugar só.
      </p>

      <div className="adm-stats">
        <div className="adm-stat">
          <span className="adm-stat-num">{ordersMonth}</span>
          <span className="adm-stat-label">Pedidos no mês</span>
          {ordersDelta !== null && (
            <span className={`adm-stat-delta ${ordersDelta >= 0 ? 'up' : 'down'}`}>
              {ordersDelta >= 0 ? '▲' : '▼'} {Math.abs(ordersDelta)}% vs mês passado
            </span>
          )}
        </div>
        <div className="adm-stat">
          <span className="adm-stat-num money green">{fmtMoneyRound(gmvMonth)}</span>
          <span className="adm-stat-label">Vendas no mês</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat-num money">{fmtCents(avgTicket)}</span>
          <span className="adm-stat-label">Ticket médio</span>
        </div>
        <Link href="/admin/leads" className={`adm-stat ${leadCounts.novo > 0 ? 'highlight' : ''}`}>
          <span className="adm-stat-num">{leadCounts.novo}</span>
          <span className="adm-stat-label">Leads pendentes</span>
        </Link>
        <Link href="/admin/leads" className="adm-stat">
          <span className="adm-stat-num">{conversion}%</span>
          <span className="adm-stat-label">Conversão</span>
        </Link>
        <Link href="/admin/lojas" className="adm-stat">
          <span className="adm-stat-num">{stores.length}</span>
          <span className="adm-stat-label">Lojas ativas</span>
          {newStoresMonth > 0 && <span className="adm-stat-delta up">+{newStoresMonth} no mês</span>}
        </Link>
        <Link href="/admin/lojas" className="adm-stat">
          <span className="adm-stat-num pro">{proCount}</span>
          <span className="adm-stat-label">Assinantes Pro</span>
        </Link>
      </div>

      <section className="adm-panel adm-chart-panel">
        <div className="adm-panel-head">
          <h2>Pedidos por dia</h2>
          <span className="adm-panel-note">
            últimos {CHART_DAYS} dias · {chartTotal} pedido{chartTotal === 1 ? '' : 's'}
          </span>
        </div>
        <div className="adm-bars" role="img" aria-label={`Pedidos por dia nos últimos ${CHART_DAYS} dias`}>
          {days.map((d, i) => {
            const isToday = i === days.length - 1
            return (
              <div key={d.key} className="adm-bar-col" title={`${d.weekday} ${d.key} — ${d.count} pedido${d.count === 1 ? '' : 's'}`}>
                <span className={`adm-bar-val ${d.count === 0 ? 'zero' : ''}`}>{d.count}</span>
                <div className="adm-bar-track">
                  <div
                    className={`adm-bar ${isToday ? 'today' : ''}`}
                    style={{ height: `${Math.max(d.count > 0 ? 6 : 2, Math.round((d.count / maxDay) * 100))}%` }}
                  />
                </div>
                <span className={`adm-bar-day ${isToday ? 'today' : ''}`}>{d.dayNum}</span>
              </div>
            )
          })}
        </div>
      </section>

      <div className="adm-panels">
        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>🔥 Radar de upgrade</h2>
            <Link href="/admin/lojas" className="adm-panel-link">gerenciar planos →</Link>
          </div>
          <p className="adm-panel-hint">
            Lojas Lite mais próximas do limite de {freeLimit} pedidos/mês — as mais quentes pra fechar o Pro.
          </p>
          {radar.length === 0 ? (
            <p className="adm-panel-empty">Nenhuma loja Lite com pedidos neste mês ainda.</p>
          ) : (
            <ul className="adm-radar">
              {radar.map((s) => {
                const heat = s.pct >= 80 ? 'hot' : s.pct >= 50 ? 'warm' : ''
                return (
                  <li key={s.id} className="adm-radar-row">
                    <div className="adm-radar-top">
                      <span className="adm-radar-name">
                        {s.name}
                        {s.pct >= 80 && <span className="adm-radar-flame" title="Pronta pra virar Pro">🔥</span>}
                      </span>
                      <span className={`adm-radar-count ${heat}`}>
                        {s.orders}/{freeLimit}
                      </span>
                    </div>
                    <div className="adm-radar-track">
                      <div className={`adm-radar-fill ${heat}`} style={{ width: `${s.pct}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>Últimos pedidos</h2>
            <span className="adm-panel-note">todas as lojas</span>
          </div>
          {feed.length === 0 ? (
            <p className="adm-panel-empty">Nenhum pedido registrado ainda.</p>
          ) : (
            <ul className="adm-feed">
              {feed.map((o) => {
                const store = storeOf(o.stores)
                return (
                  <li key={o.id} className="adm-feed-row">
                    <div className="adm-feed-main">
                      <span className="adm-feed-title">
                        {fmtOrderNumber(o.order_number, o.id)} · {o.customer_name || 'Cliente'}
                      </span>
                      <span className="adm-feed-sub">
                        {store?.name || 'Loja'} · {ORDER_TYPE_LABEL[o.order_type] || o.order_type} · {fmtWhen(o.created_at, now)}
                      </span>
                    </div>
                    <div className="adm-feed-side">
                      <span className="adm-feed-total">{fmtCents(orderValue(o))}</span>
                      <span className={`adm-feed-status st-${o.status}`}>{STATUS_LABEL[o.status] || o.status}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>Leads aguardando contato</h2>
            <Link href="/admin/leads" className="adm-panel-link">ver todos →</Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="adm-panel-empty">✅ Nenhum lead pendente — tudo em dia!</p>
          ) : (
            <ul className="adm-mini-list">
              {recentLeads.map((l) => (
                <li key={l.id}>
                  <span className="adm-mini-name">{l.name || 'Sem nome'}</span>
                  {l.company && <span className="adm-mini-sub">{l.company}</span>}
                  <span className="adm-mini-date">
                    {new Date(l.created_at).toLocaleDateString('pt-BR', { timeZone: SP_TZ, day: '2-digit', month: '2-digit' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>Atalhos</h2>
          </div>
          <div className="adm-shortcuts">
            <Link href="/admin/leads" className="adm-shortcut">
              📋 <span>Painel de leads<br /><small>aprovar contas, WhatsApp, anotações</small></span>
            </Link>
            <Link href="/admin/lojas" className="adm-shortcut">
              🏪 <span>Todas as lojas<br /><small>planos, pedidos, donos</small></span>
            </Link>
            <Link href="/signup" className="adm-shortcut">
              ➕ <span>Criar loja manual<br /><small>sem passar por lead</small></span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
