'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Bike,
  CalendarClock,
  Check,
  ChevronRight,
  Hourglass,
  RotateCw,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fmtCents, fmtOrderNumber, STATUS_LABEL } from '@/lib/format'
import { IconClose } from '@/components/icons'
import type { OrderHistoryEntry } from '@/lib/orderHistory'

type OrderSummary = {
  status: string
  payment_status?: string | null
  order_number: number | null
  order_type: string | null
  total_cents: number
  item_count: number
  items_preview: string
}

type RpcOrder = {
  status: string
  payment_status?: string | null
  order_number: number | null
  order_type?: string | null
  total_cents: number
  items?: { name: string; quantity: number }[]
}

const STATUS_META: Record<string, { tone: Tone }> = {
  agendado: { tone: 'pending' },
  novo: { tone: 'pending' },
  preparando: { tone: 'active' },
  pronto: { tone: 'active' },
  a_caminho: { tone: 'active' },
  concluido: { tone: 'done' },
  cancelado: { tone: 'canceled' },
}

type Tone = 'pending' | 'active' | 'done' | 'canceled'

const FLOW_DELIVERY = ['novo', 'preparando', 'pronto', 'a_caminho', 'concluido']
const FLOW_OTHER = ['novo', 'preparando', 'pronto', 'concluido']

const ORDER_TYPE_META: Record<string, { label: string; Icon: LucideIcon }> = {
  delivery: { label: 'Entrega', Icon: Bike },
  pickup: { label: 'Retirada', Icon: Store },
  dine_in: { label: 'Na mesa', Icon: UtensilsCrossed },
}

// Enquanto o modal está aberto, o status é reconsultado pra lista não ficar parada.
const REFRESH_MS = 20_000

function fmtWhen(iso: string) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((startOfToday.getTime() - d.getTime()) / 86_400_000) + 1
  if (d >= startOfToday) return `Hoje, ${time}`
  if (diffDays === 1) return `Ontem, ${time}`
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}, ${time}`
}

function isFinished(s: OrderSummary | undefined) {
  return !!s && (s.status === 'concluido' || s.status === 'cancelado') && s.payment_status !== 'pending'
}

export default function MyOrdersModal({
  orders,
  onClose,
}: {
  orders: OrderHistoryEntry[]
  onClose: () => void
}) {
  const [summaries, setSummaries] = useState<Record<string, OrderSummary>>({})
  const [failed, setFailed] = useState<Record<string, boolean>>({})
  const [refreshing, setRefreshing] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (orders.length === 0) return
    let cancelled = false
    const supabase = createClient()

    const load = () => {
      setRefreshing(true)
      Promise.all(
        orders.map((o) =>
          supabase
            .rpc('get_order', { p_id: o.id })
            .then(({ data }: { data: RpcOrder | null }) => ({ id: o.id, data }))
        )
      ).then((results) => {
        if (cancelled) return
        setRefreshing(false)
        setSummaries((prev) => {
          const next = { ...prev }
          for (const r of results) {
            if (!r.data) continue
            const items = r.data.items ?? []
            next[r.id] = {
              status: r.data.status,
              payment_status: r.data.payment_status,
              order_number: r.data.order_number,
              order_type: r.data.order_type ?? null,
              total_cents: r.data.total_cents,
              item_count: items.reduce((s, it) => s + it.quantity, 0),
              items_preview: items.map((it) => `${it.quantity}x ${it.name}`).join(', '),
            }
          }
          return next
        })
        setFailed((prev) => {
          const next = { ...prev }
          for (const r of results) next[r.id] = !r.data
          return next
        })
      })
    }

    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [orders, reloadKey])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const sorted = useMemo(
    () => [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders]
  )
  // Pedido que falhou ao carregar (removido/expirado) cai em "Anteriores" pra não poluir o topo.
  const ongoing = sorted.filter((o) => !isFinished(summaries[o.id]) && !failed[o.id])
  const past = sorted.filter((o) => isFinished(summaries[o.id]) || failed[o.id])

  return (
    <div className="option-modal-overlay my-orders-overlay" onClick={onClose}>
      <div
        className="my-orders-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-orders-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="my-orders-grabber" aria-hidden />
        <header className="my-orders-header">
          <span className="my-orders-header-icon">
            <ShoppingBag size={20} strokeWidth={2} />
          </span>
          <div className="my-orders-header-text">
            <h2 id="my-orders-title">Meus pedidos</h2>
            <p>
              {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'} neste aparelho
            </p>
          </div>
          <button
            className="my-orders-icon-btn"
            onClick={() => setReloadKey((k) => k + 1)}
            aria-label="Atualizar status"
            title="Atualizar status"
          >
            <RotateCw size={16} strokeWidth={2.2} className={refreshing ? 'is-spinning' : ''} />
          </button>
          <button className="my-orders-icon-btn" onClick={onClose} aria-label="Fechar">
            <IconClose />
          </button>
        </header>

        <div className="my-orders-body">
          {ongoing.length > 0 && (
            <section className="my-orders-section">
              <h3 className="my-orders-section-title">
                <span className="my-orders-live-dot" /> Em andamento
              </h3>
              {ongoing.map((o) => (
                <OrderCard key={o.id} entry={o} summary={summaries[o.id]} featured />
              ))}
            </section>
          )}

          {past.length > 0 && (
            <section className="my-orders-section">
              <h3 className="my-orders-section-title">Anteriores</h3>
              {past.map((o) => (
                <OrderCard key={o.id} entry={o} summary={summaries[o.id]} unavailable={failed[o.id]} />
              ))}
            </section>
          )}
        </div>

        <footer className="my-orders-footer">
          Os pedidos ficam salvos só neste navegador. Toque em um pedido para ver os detalhes.
        </footer>
      </div>
    </div>
  )
}

// Anel que vai se completando a cada etapa do fluxo. Estados terminais fecham o
// anel inteiro (verde/vermelho); pagamento pendente e agendado giram tracejados.
function ProgressRing({
  size,
  status,
  awaitingPayment,
  step,
  total,
}: {
  size: number
  status: string
  awaitingPayment: boolean
  step: number
  total: number
}) {
  const stroke = size >= 50 ? 4.5 : 4
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r

  const waiting = awaitingPayment || status === 'agendado'
  const finished = status === 'concluido' || status === 'cancelado'
  const ratio = finished ? 1 : waiting ? 0.25 : step >= 0 ? (step + 1) / total : 0.1
  const iconSize = Math.round(size * 0.38)

  let center: ReactNode
  if (status === 'concluido') center = <Check size={iconSize} strokeWidth={3} />
  else if (status === 'cancelado') center = <X size={iconSize} strokeWidth={3} />
  else if (awaitingPayment) center = <Hourglass size={iconSize - 2} strokeWidth={2.4} />
  else if (status === 'agendado') center = <CalendarClock size={iconSize - 2} strokeWidth={2.4} />
  else
    center = (
      <span className="my-order-ring-step">
        {step + 1}
        <small>/{total}</small>
      </span>
    )

  const label = finished || waiting ? undefined : `Etapa ${step + 1} de ${total}`

  return (
    <span
      className={`my-order-ring ${waiting ? 'is-waiting' : ''} ${finished ? 'is-finished' : ''}`}
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle className="my-order-ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle
          className="my-order-ring-bar"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
        />
      </svg>
      <span className="my-order-ring-center">{center}</span>
    </span>
  )
}

function OrderCard({
  entry,
  summary,
  featured = false,
  unavailable = false,
}: {
  entry: OrderHistoryEntry
  summary?: OrderSummary
  featured?: boolean
  unavailable?: boolean
}) {
  if (!summary && !unavailable) {
    return (
      <div className={`my-order-card is-loading ${featured ? 'is-featured' : ''}`} aria-busy="true">
        <span className="my-order-icon skeleton" />
        <span className="my-order-main">
          <span className="skeleton skeleton-line" style={{ width: '45%' }} />
          <span className="skeleton skeleton-line" style={{ width: '70%' }} />
        </span>
      </div>
    )
  }

  const awaitingPayment = summary?.payment_status === 'pending'
  const meta = summary ? STATUS_META[summary.status] ?? STATUS_META.novo : null
  const tone: Tone = unavailable ? 'canceled' : awaitingPayment ? 'pending' : meta?.tone ?? 'pending'
  const statusLabel = unavailable
    ? 'Indisponível'
    : awaitingPayment
      ? 'Aguardando pagamento'
      : STATUS_LABEL[summary!.status] ?? summary!.status
  const typeMeta = summary?.order_type ? ORDER_TYPE_META[summary.order_type] : null

  const flow = summary?.order_type === 'delivery' ? FLOW_DELIVERY : FLOW_OTHER
  const step = summary ? flow.indexOf(summary.status) : -1

  return (
    <a href={`/pedido/${entry.id}`} className={`my-order-card tone-${tone} ${featured ? 'is-featured' : ''}`}>
      <div className="my-order-row">
        <ProgressRing
          size={featured ? 52 : 44}
          status={unavailable ? 'cancelado' : summary!.status}
          awaitingPayment={awaitingPayment}
          step={step}
          total={flow.length}
        />
        <span className="my-order-main">
          <span className="my-order-title">
            Pedido {summary ? fmtOrderNumber(summary.order_number, entry.id) : `#${entry.id.slice(0, 8)}`}
          </span>
          <span className="my-order-sub">
            {fmtWhen(entry.createdAt)}
            {typeMeta && (
              <>
                <span className="my-order-dot">·</span>
                <typeMeta.Icon size={12} strokeWidth={2.2} aria-label={typeMeta.label} />
                <span className="my-order-type-label">{typeMeta.label}</span>
              </>
            )}
          </span>
        </span>
        <span className="my-order-right">
          {summary && <span className="my-order-total">{fmtCents(summary.total_cents)}</span>}
          <span className="my-order-status">{statusLabel}</span>
        </span>
      </div>

      {summary?.items_preview && (
        <p className="my-order-items" title={summary.items_preview}>
          {summary.items_preview}
        </p>
      )}

      {featured && (
        <span className="my-order-cta">
          {awaitingPayment ? 'Concluir pagamento' : 'Acompanhar pedido'}
          <ChevronRight size={16} strokeWidth={2.4} />
        </span>
      )}
      {!featured && <ChevronRight className="my-order-chevron" size={18} strokeWidth={2} />}
    </a>
  )
}
