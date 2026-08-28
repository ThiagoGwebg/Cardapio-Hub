'use client'

import { useMemo, useState } from 'react'
import { ArrowUpCircle, CalendarDays, CreditCard, Flame, Package, Star, User, Wallet, X } from 'lucide-react'
import { PLAN_LIMITS } from '@/lib/stripe/plans'
import { planLabel, type BillingPlan } from '@/lib/billing/plans'
import { fmtCents } from '@/lib/format'
import PlanToggle from './PlanToggle'
import UpgradeRequest from './UpgradeRequest'
import BillingControl, { type BillingInfo } from './BillingControl'

export type AdminStore = {
  id: string
  name: string
  slug: string
  email?: string
  /** Plano ativo da loja. `isPro` continua existindo: e o gate dos recursos Pro. */
  plan: BillingPlan
  isPro: boolean
  isOpen: boolean
  orders: number
  gmvCents: number
  createdAt: string
  mpConnected: boolean
  mpUserId?: string
  /** Pedido de upgrade em aberto que o lojista fez pelo painel. */
  upgradeRequest: { createdAt: string; phone: string | null; note: string | null } | null
  billing: BillingInfo
}

type SortKey = 'recent' | 'orders' | 'gmv' | 'name'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Mais recentes' },
  { key: 'orders', label: 'Mais pedidos' },
  { key: 'gmv', label: 'Maior faturamento' },
  { key: 'name', label: 'Nome (A–Z)' },
]

function fmtMoneyRound(cents: number) {
  return 'R$ ' + Math.round(cents / 100).toLocaleString('pt-BR')
}

export default function StoresBoard({ stores }: { stores: AdminStore[] }) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')
  const [planFilter, setPlanFilter] = useState<'all' | BillingPlan>('all')
  const [onlyRequested, setOnlyRequested] = useState(false)

  const totals = useMemo(() => {
    const gmv = stores.reduce((s, x) => s + x.gmvCents, 0)
    const orders = stores.reduce((s, x) => s + x.orders, 0)
    const pro = stores.filter((s) => s.isPro).length
    const requested = stores.filter((s) => s.upgradeRequest).length
    return { gmv, orders, pro, requested }
  }, [stores])

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    let list = stores.filter((s) => {
      if (onlyRequested && !s.upgradeRequest) return false
      if (planFilter !== 'all' && s.plan !== planFilter) return false
      if (!term) return true
      return s.name.toLowerCase().includes(term) || (s.email || '').toLowerCase().includes(term)
    })
    list = [...list].sort((a, b) => {
      if (sort === 'orders') return b.orders - a.orders
      if (sort === 'gmv') return b.gmvCents - a.gmvCents
      if (sort === 'name') return a.name.localeCompare(b.name, 'pt-BR')
      return +new Date(b.createdAt) - +new Date(a.createdAt)
    })
    return list
  }, [stores, q, sort, planFilter, onlyRequested])


  return (
    <>
      <div className="adm-store-summary">
        <div className="adm-summary-cell">
          <span className="adm-summary-num">{fmtMoneyRound(totals.gmv)}</span>
          <span className="adm-summary-label">Faturamento no mês</span>
        </div>
        <div className="adm-summary-cell">
          <span className="adm-summary-num">{totals.orders}</span>
          <span className="adm-summary-label">Pedidos no mês</span>
        </div>
        <div className="adm-summary-cell">
          <span className="adm-summary-num">{totals.pro}</span>
          <span className="adm-summary-label">Assinantes Pro</span>
        </div>
        <div className="adm-summary-cell">
          <span className={`adm-summary-num ${totals.requested > 0 ? 'wants-pro' : ''}`}>{totals.requested}</span>
          <span className="adm-summary-label">Pediram o Pro</span>
        </div>
      </div>

      <div className="adm-store-toolbar">
        <div className="adm-store-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por loja ou e-mail do dono…"
            aria-label="Buscar lojas"
          />
          {q && (
            <button className="adm-store-search-clear" onClick={() => setQ('')} aria-label="Limpar busca">
              <X size={14} strokeWidth={2.4} />
            </button>
          )}
        </div>
        <div className="adm-store-filters">
          <div className="adm-seg">
            {(['all', 'free', 'plus', 'pro'] as const).map((f) => (
              <button key={f} className={planFilter === f ? 'on' : ''} onClick={() => setPlanFilter(f)}>
                {f === 'all' ? 'Todas' : planLabel(f)}
              </button>
            ))}
          </div>
          {totals.requested > 0 && (
            <button
              className={`adm-req-filter ${onlyRequested ? 'on' : ''}`}
              onClick={() => setOnlyRequested((v) => !v)}
              aria-pressed={onlyRequested}
            >
              <ArrowUpCircle size={13} strokeWidth={2.4} /> Pediram o Pro ({totals.requested})
            </button>
          )}
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Ordenar lojas">
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="adm-store-list">
        {visible.map((store) => {
          const orders = store.orders
          const limit = PLAN_LIMITS[store.plan].maxOrdersPerMonth
          const pct = Number.isFinite(limit) ? Math.min(100, Math.round((orders / limit) * 100)) : 0
          const heat = pct >= 80 ? 'hot' : pct >= 50 ? 'warm' : ''
          return (
            <article key={store.id} className="adm-store-card">
              <div className="adm-store-main">
                <div className="adm-store-name">
                  {store.name}
                  <span className={`adm-badge ${store.isPro ? 'pro' : ''}`}>
                    {store.isPro && <Star size={11} strokeWidth={2.6} />} {planLabel(store.plan)}
                  </span>
                  {store.upgradeRequest && (
                    <span className="adm-badge wants-pro" title="O lojista pediu o upgrade pelo painel">
                      <ArrowUpCircle size={11} strokeWidth={2.6} /> Pediu o Pro
                    </span>
                  )}
                  {!store.isOpen && <span className="adm-badge closed">Fechada</span>}
                  {store.mpConnected && (
                    <span className="adm-badge" title={store.mpUserId ? `Conta MP ${store.mpUserId}` : 'Mercado Pago conectado'}>
                      <CreditCard size={11} strokeWidth={2.4} /> MP{store.mpUserId ? ` ${store.mpUserId}` : ''}
                    </span>
                  )}
                </div>
                <div className="adm-store-meta">
                  {store.email && (
                    <span title="Dono da loja">
                      <User size={12} strokeWidth={2.2} /> {store.email}
                    </span>
                  )}
                  <span>
                    <Package size={12} strokeWidth={2.2} /> {orders} pedido{orders === 1 ? '' : 's'}
                  </span>
                  <span title="Faturamento no mês">
                    <Wallet size={12} strokeWidth={2.2} /> {fmtCents(store.gmvCents)}
                  </span>
                  <span>
                    <CalendarDays size={12} strokeWidth={2.2} /> desde{' '}
                    {new Date(store.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {store.upgradeRequest && (
                  <UpgradeRequest storeId={store.id} storeName={store.name} request={store.upgradeRequest} />
                )}
                {Number.isFinite(limit) && (
                  <div className="adm-usage" title={`Limite do plano ${planLabel(store.plan)}: ${limit} pedidos/mês`}>
                    <div className="adm-usage-track">
                      <div className={`adm-usage-fill ${heat}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`adm-usage-label ${heat}`}>
                      {orders}/{limit} do limite {planLabel(store.plan)}
                      {pct >= 80 && (
                        <>
                          {' · '}
                          <Flame size={11} strokeWidth={2.4} /> hora do Pro
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>
              <div className="adm-store-actions">
                <a className="adm-btn ghost" href={`/loja/${store.slug}`} target="_blank" rel="noopener noreferrer">
                  Ver cardápio ↗
                </a>
                <PlanToggle storeId={store.id} plan={store.plan} />
                <BillingControl storeId={store.id} billing={store.billing} />
              </div>
            </article>
          )
        })}

        {visible.length === 0 && (
          <p className="adm-panel-empty">
            {stores.length === 0 ? 'Nenhuma loja criada ainda.' : 'Nenhuma loja encontrada com esse filtro.'}
          </p>
        )}
      </div>
    </>
  )
}
