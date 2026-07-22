'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { fmtCents, fmtElapsed, fmtOrderNumber, fmtScheduledFor, fmtUntil, ORDER_TYPE_LABEL, PAYMENT_LABEL, STATUS_LABEL } from '@/lib/format'
import { advanceOrder, cancelOrder } from '@/app/dashboard/pedidos/actions'

const SOUND_KEY = 'cardapiohub_kanban_sound'

function playNewOrderBeep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const now = ctx.currentTime
    ;[0, 0.18].forEach((delay) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, now + delay)
      gain.gain.exponentialRampToValueAtTime(0.35, now + delay + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.16)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + delay)
      osc.stop(now + delay + 0.18)
    })
    setTimeout(() => ctx.close(), 500)
  } catch {
    // ambiente sem suporte a áudio — ignora silenciosamente
  }
}

type OptSnap = { name_snapshot: string }
type OrderItem = { id: string; product_name_snapshot: string; quantity: number; order_item_options: OptSnap[] }
type Order = {
  id: string
  order_number: number | null
  status: string
  order_type: string
  payment_method: string | null
  customer_name: string
  customer_phone: string | null
  subtotal_cents: number
  delivery_fee_cents: number
  total_cents: number
  table_number: string | null
  address_cep: string | null
  address_street: string | null
  address_number: string | null
  address_neighborhood: string | null
  created_at: string
  scheduled_for: string | null
  order_items: OrderItem[]
}

const TYPE_EMOJI: Record<string, string> = {
  delivery: '🛵',
  pickup: '🛍',
  dine_in: '🍽',
}

// Chips de filtro por status (a coluna virou filtro — mesma visão do kanban, em lista)
const FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'agendado', label: 'Agendados' },
  { id: 'novo', label: 'Novos' },
  { id: 'preparando', label: 'Preparando' },
  { id: 'pronto', label: 'Prontos' },
  { id: 'a_caminho', label: 'A caminho' },
  { id: 'concluido', label: 'Concluídos' },
  { id: 'cancelado', label: 'Cancelados' },
]

const PILL_CLASS: Record<string, string> = {
  agendado: 'ol-pill-sched',
  novo: 'ol-pill-new',
  preparando: 'ol-pill-prep',
  pronto: 'ol-pill-ready',
  a_caminho: 'ol-pill-route',
  concluido: 'ol-pill-done',
  cancelado: 'ol-pill-cancel',
}

function nextActionLabel(order: Order): string | null {
  switch (order.status) {
    case 'agendado':
    case 'novo':
      return 'Iniciar preparo'
    case 'preparando':
      return 'Marcar pronto'
    case 'pronto':
      return order.order_type === 'delivery' ? 'Saiu p/ entrega' : 'Concluir'
    case 'a_caminho':
      return 'Concluir'
    default:
      return null
  }
}

function waPhone(raw: string) {
  const d = raw.replace(/\D/g, '')
  if (d.startsWith('55')) return d
  if (d.length === 10 || d.length === 11) return '55' + d
  return d
}

function statusMessage(order: Order, storeName: string) {
  const num = fmtOrderNumber(order.order_number, order.id)
  const hi = `Oi ${order.customer_name.split(' ')[0]}! `
  switch (order.status) {
    case 'agendado':
      return `${hi}Seu pedido ${num} está agendado${order.scheduled_for ? ` para ${fmtScheduledFor(order.scheduled_for)}` : ''} aqui na ${storeName} 📅 Qualquer coisa é só chamar!`
    case 'novo':
      return `${hi}Recebemos seu pedido ${num} aqui na ${storeName} 😊 Já vamos começar!`
    case 'preparando':
      return `${hi}Seu pedido ${num} já está em preparo 👨‍🍳`
    case 'pronto':
      return order.order_type === 'delivery'
        ? `${hi}Seu pedido ${num} está pronto e já vai sair pra entrega! 🛵`
        : order.order_type === 'dine_in'
          ? `${hi}Seu pedido ${num} está pronto! 🍽`
          : `${hi}Seu pedido ${num} está pronto pra retirada! 🛍`
    case 'a_caminho':
      return `${hi}Seu pedido ${num} saiu pra entrega 🛵 Já já chega!`
    case 'concluido':
      return `${hi}Pedido ${num} concluído. Obrigado pela preferência! 🙏`
    default:
      return `${hi}Atualização do seu pedido ${num}.`
  }
}

export default function OrdersList({ storeId, storeName, orders }: { storeId: string; storeName: string; orders: Order[] }) {
  const router = useRouter()
  const [soundOn, setSoundOn] = useState(true)
  const [flash, setFlash] = useState(false)
  const [filter, setFilter] = useState('todos')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // Relógio só no cliente (evita mismatch de hidratação); atualiza a cada 30s.
  const [now, setNow] = useState<number | null>(null)
  const unlockedRef = useRef(false)
  // Lido por ref pra o callback do realtime sempre pegar o valor atual sem
  // precisar re-inscrever o canal (evita destruir/recriar a conexão no meio
  // do handshake sempre que o som é alternado ou sincronizado do localStorage).
  const soundOnRef = useRef(soundOn)
  useEffect(() => {
    soundOnRef.current = soundOn
  }, [soundOn])

  // Ids já visíveis (pedidos pagos/sem pagamento). Usado pra tocar o alerta de
  // "pedido novo" quando um pagamento é confirmado e o pedido aparece pela 1ª vez.
  const knownIdsRef = useRef<Set<string>>(new Set(orders.map((o) => o.id)))
  useEffect(() => {
    knownIdsRef.current = new Set(orders.map((o) => o.id))
  }, [orders])

  useEffect(() => {
    // setTimeout (e não requestAnimationFrame): rAF pausa em aba de segundo
    // plano, e o painel costuma ficar aberto em background esperando pedido.
    const init = setTimeout(() => {
      setNow(Date.now())
      const saved = localStorage.getItem(SOUND_KEY)
      if (saved !== null) setSoundOn(saved === '1')
    }, 0)
    const tick = setInterval(() => setNow(Date.now()), 30_000)
    // desbloqueia o áudio no primeiro clique da página (política de autoplay dos navegadores)
    const unlock = () => {
      unlockedRef.current = true
      window.removeEventListener('click', unlock)
    }
    window.addEventListener('click', unlock)
    return () => {
      clearTimeout(init)
      clearInterval(tick)
      window.removeEventListener('click', unlock)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`orders-${storeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
        (payload) => {
          // Pedido aguardando pagamento online ainda não é visível — não alerta.
          if ((payload.new as { payment_status?: string })?.payment_status === 'pending') return
          if (soundOnRef.current && unlockedRef.current) playNewOrderBeep()
          setFlash(true)
          setTimeout(() => setFlash(false), 2000)
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
        (payload) => {
          const row = payload.new as { id?: string; payment_status?: string }
          // Pagamento confirmado agora: o pedido "aparece" pela 1ª vez → trata como novo.
          if (row?.payment_status === 'paid' && row.id && !knownIdsRef.current.has(row.id)) {
            if (soundOnRef.current && unlockedRef.current) playNewOrderBeep()
            setFlash(true)
            setTimeout(() => setFlash(false), 2000)
          }
          router.refresh()
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [storeId, router])

  function toggleSound() {
    setSoundOn((prev) => {
      const next = !prev
      localStorage.setItem(SOUND_KEY, next ? '1' : '0')
      if (next) playNewOrderBeep()
      return next
    })
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: orders.length }
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1
    return c
  }, [orders])

  // Chips condicionais: "A caminho" só se a loja tem delivery; "Agendados" só se existe encomenda
  const filters = FILTERS.filter((f) => {
    if (f.id === 'a_caminho') return orders.some((o) => o.order_type === 'delivery')
    if (f.id === 'agendado') return (counts.agendado ?? 0) > 0
    return true
  })

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = orders.filter((o) => {
      if (filter !== 'todos' && o.status !== filter) return false
      if (!q) return true
      const num = o.order_number != null ? String(o.order_number) : o.id.slice(0, 8)
      return o.customer_name.toLowerCase().includes(q) || num.includes(q.replace(/[#nº°\s]/g, ''))
    })
    // Agendados fixados no topo (o mais próximo primeiro); o resto segue por recência
    const scheduled = list
      .filter((o) => o.status === 'agendado')
      .sort((a, b) => (a.scheduled_for ?? '').localeCompare(b.scheduled_for ?? ''))
    return [...scheduled, ...list.filter((o) => o.status !== 'agendado')]
  }, [orders, filter, search])

  async function cancel(order: Order) {
    const num = fmtOrderNumber(order.order_number, order.id)
    if (!window.confirm(`Cancelar o pedido ${num} de ${order.customer_name}?`)) return
    await cancelOrder(order.id)
  }

  return (
    <div>
      <div className="ol-toolbar">
        <input
          className="form-input ol-search"
          placeholder="Buscar por cliente ou nº do pedido…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className={`sound-toggle ${flash ? 'flash' : ''}`} onClick={toggleSound}>
          {soundOn ? '🔔 Som ligado' : '🔕 Som desligado'}
        </button>
      </div>

      <div className="ol-filters">
        {filters.map((f) => (
          <button
            key={f.id}
            className={`ol-chip ${filter === f.id ? 'active' : ''} ${f.id === 'novo' && (counts.novo ?? 0) > 0 ? 'ol-chip-attention' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            <span className="ol-chip-count">{counts[f.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="ol-list">
        {visible.length === 0 && (
          <div className="ol-empty">
            {orders.length === 0
              ? 'Nenhum pedido ainda. Assim que um cliente pedir pelo cardápio público, ele aparece aqui em tempo real.'
              : 'Nenhum pedido nesse filtro.'}
          </div>
        )}

        {visible.map((order) => {
          const expanded = expandedId === order.id
          const action = nextActionLabel(order)
          const due = order.status === 'agendado' && order.scheduled_for != null && now != null && new Date(order.scheduled_for).getTime() <= now
          return (
            <div key={order.id} className={`ol-row ol-status-${order.status} ${due ? 'ol-due' : ''} ${expanded ? 'expanded' : ''}`}>
              <button
                type="button"
                className="ol-row-main"
                onClick={() => setExpandedId(expanded ? null : order.id)}
              >
                <span className="ol-avatar" aria-hidden>
                  {TYPE_EMOJI[order.order_type] ?? '🧾'}
                </span>
                <span className="ol-info">
                  <span className="ol-name-line">
                    <span className="ol-name">{order.customer_name}</span>
                    <span className="ol-num">{fmtOrderNumber(order.order_number, order.id)}</span>
                  </span>
                  <span className="ol-sub">
                    {order.scheduled_for && (
                      <span className="ol-sched-line">📅 {fmtScheduledFor(order.scheduled_for)} · </span>
                    )}
                    {fmtCents(order.total_cents)}
                    {order.order_type === 'dine_in' && order.table_number ? ` · Mesa ${order.table_number}` : ''}
                    {order.payment_method ? ` · ${PAYMENT_LABEL[order.payment_method]}` : ''}
                  </span>
                </span>
                <span className="ol-right">
                  <span className="ol-elapsed">
                    {now
                      ? order.status === 'agendado' && order.scheduled_for
                        ? fmtUntil(order.scheduled_for, now)
                        : fmtElapsed(order.created_at, now)
                      : ''}
                  </span>
                  <span className={`ol-pill ${PILL_CLASS[order.status] ?? ''}`}>{STATUS_LABEL[order.status] ?? order.status}</span>
                </span>
              </button>

              {expanded && (
                <div className="ol-detail">
                  <div className="ol-detail-tags">
                    <span className="order-tag">{ORDER_TYPE_LABEL[order.order_type]}</span>
                    {order.scheduled_for && <span className="order-tag">📅 {fmtScheduledFor(order.scheduled_for)}</span>}
                    {order.payment_method && <span className="order-tag">{PAYMENT_LABEL[order.payment_method]}</span>}
                    <span className="order-tag">
                      {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {order.order_type === 'delivery' && order.address_street && (
                    <div className="ol-addr">
                      📍 {order.address_street}, {order.address_number} — {order.address_neighborhood}
                      {order.address_cep ? ` · CEP ${order.address_cep}` : ''}
                    </div>
                  )}

                  <div className="ol-items">
                    {order.order_items.map((i) => (
                      <div key={i.id}>
                        {i.quantity}x {i.product_name_snapshot}
                        {i.order_item_options.length > 0 && (
                          <span style={{ color: 'var(--muted)' }}>
                            {' '}· {i.order_item_options.map((o) => o.name_snapshot).join(', ')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="ol-actions">
                    {action && (
                      <button
                        className="advance-btn ol-advance"
                        onClick={() => advanceOrder(order.id, order.status, order.order_type)}
                      >
                        {action} →
                      </button>
                    )}
                    {order.customer_phone && (
                      <button
                        className="notify-btn ol-notify"
                        onClick={() =>
                          window.open(
                            `https://wa.me/${waPhone(order.customer_phone!)}?text=${encodeURIComponent(statusMessage(order, storeName))}`,
                            '_blank'
                          )
                        }
                        title="Enviar atualização pelo WhatsApp"
                      >
                        💬 Avisar
                      </button>
                    )}
                    <Link href={`/dashboard/pedidos/${order.id}`} className="ol-detail-link" title="Ver ficha / imprimir">
                      Ficha →
                    </Link>
                    {action && (
                      <button className="ol-cancel" onClick={() => cancel(order)} title="Cancelar pedido">
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
