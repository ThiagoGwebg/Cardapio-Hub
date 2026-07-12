'use client'

import { useMemo, useState } from 'react'
import { PLAN_LIMITS } from '@/lib/stripe/plans'
import { fmtCents } from '@/lib/format'
import PlanToggle from './PlanToggle'

export type AdminStore = {
  id: string
  name: string
  slug: string
  email?: string
  isPro: boolean
  isOpen: boolean
  orders: number
  gmvCents: number
  createdAt: string
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
  const [onlyPro, setOnlyPro] = useState<'all' | 'pro' | 'lite'>('all')

  const totals = useMemo(() => {
    const gmv = stores.reduce((s, x) => s + x.gmvCents, 0)
    const orders = stores.reduce((s, x) => s + x.orders, 0)
    const pro = stores.filter((s) => s.isPro).length
    return { gmv, orders, pro }
  }, [stores])

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    let list = stores.filter((s) => {
      if (onlyPro === 'pro' && !s.isPro) return false
      if (onlyPro === 'lite' && s.isPro) return false
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
  }, [stores, q, sort, onlyPro])

  const limit = PLAN_LIMITS.free.maxOrdersPerMonth

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
              ✕
            </button>
          )}
        </div>
        <div className="adm-store-filters">
          <div className="adm-seg">
            {(['all', 'pro', 'lite'] as const).map((f) => (
              <button key={f} className={onlyPro === f ? 'on' : ''} onClick={() => setOnlyPro(f)}>
                {f === 'all' ? 'Todas' : f === 'pro' ? 'Pro' : 'Lite'}
              </button>
            ))}
          </div>
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
          const pct = Math.min(100, Math.round((orders / limit) * 100))
          const heat = pct >= 80 ? 'hot' : pct >= 50 ? 'warm' : ''
          return (
            <article key={store.id} className="adm-store-card">
              <div className="adm-store-main">
                <div className="adm-store-name">
                  {store.name}
                  <span className={`adm-badge ${store.isPro ? 'pro' : ''}`}>{store.isPro ? '★ Pro' : 'Lite'}</span>
                  {!store.isOpen && <span className="adm-badge closed">Fechada</span>}
                </div>
                <div className="adm-store-meta">
                  {store.email && <span title="Dono da loja">👤 {store.email}</span>}
                  <span>📦 {orders} pedido{orders === 1 ? '' : 's'}</span>
                  <span title="Faturamento no mês">💰 {fmtCents(store.gmvCents)}</span>
                  <span>
                    📅 desde{' '}
                    {new Date(store.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {!store.isPro && (
                  <div className="adm-usage" title={`Limite do plano Lite: ${limit} pedidos/mês`}>
                    <div className="adm-usage-track">
                      <div className={`adm-usage-fill ${heat}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`adm-usage-label ${heat}`}>
                      {orders}/{limit} do limite Lite{pct >= 80 ? ' · 🔥 hora do Pro' : ''}
                    </span>
                  </div>
                )}
              </div>
              <div className="adm-store-actions">
                <a className="adm-btn ghost" href={`/loja/${store.slug}`} target="_blank" rel="noopener noreferrer">
                  Ver cardápio ↗
                </a>
                <PlanToggle storeId={store.id} isPro={store.isPro} />
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
