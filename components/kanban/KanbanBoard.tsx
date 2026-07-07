'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { fmtCents, fmtOrderNumber, ORDER_TYPE_LABEL, PAYMENT_LABEL } from '@/lib/format'
import { advanceOrder, cancelOrder } from '@/app/dashboard/pedidos/actions'

const SOUND_KEY = 'cardapioagil_kanban_sound'

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
  order_items: OrderItem[]
}

const COLUMNS = [
  { id: 'novo', label: 'Novos', dot: 'dot-pending', next: 'Iniciar Preparo' },
  { id: 'preparando', label: 'Preparando', dot: 'dot-prep', next: 'Marcar Pronto' },
  { id: 'pronto', label: 'Pronto', dot: 'dot-ready', next: 'Avançar' },
  { id: 'a_caminho', label: 'A caminho', dot: 'dot-prep', next: 'Concluir' },
  { id: 'concluido', label: 'Concluídos', dot: 'dot-done', next: null },
]

function nextLabel(col: (typeof COLUMNS)[number], orderType: string) {
  if (col.id === 'pronto') return orderType === 'delivery' ? 'Saiu p/ Entrega' : 'Concluir'
  return col.next
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

export default function KanbanBoard({ storeId, storeName, orders }: { storeId: string; storeName: string; orders: Order[] }) {
  const router = useRouter()
  const [soundOn, setSoundOn] = useState(true)
  const [flash, setFlash] = useState(false)
  const unlockedRef = useRef(false)

  useEffect(() => {
    const saved = localStorage.getItem(SOUND_KEY)
    if (saved !== null) setSoundOn(saved === '1')
    // desbloqueia o áudio no primeiro clique da página (política de autoplay dos navegadores)
    const unlock = () => {
      unlockedRef.current = true
      window.removeEventListener('click', unlock)
    }
    window.addEventListener('click', unlock)
    return () => window.removeEventListener('click', unlock)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`orders-${storeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
        () => {
          if (soundOn && unlockedRef.current) playNewOrderBeep()
          setFlash(true)
          setTimeout(() => setFlash(false), 2000)
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
        () => router.refresh()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [storeId, router, soundOn])

  function toggleSound() {
    setSoundOn((prev) => {
      const next = !prev
      localStorage.setItem(SOUND_KEY, next ? '1' : '0')
      if (next) playNewOrderBeep()
      return next
    })
  }

  // "A caminho" só faz sentido para delivery; esconde a coluna se não houver nenhum
  const showACaminho = orders.some((o) => o.order_type === 'delivery')
  const columns = COLUMNS.filter((c) => c.id !== 'a_caminho' || showACaminho)

  return (
    <div>
      <div className="kanban-toolbar">
        <button className={`sound-toggle ${flash ? 'flash' : ''}`} onClick={toggleSound}>
          {soundOn ? '🔔 Som ligado' : '🔕 Som desligado'}
        </button>
      </div>
      <div className="kanban">
      {columns.map((col) => {
        const colOrders = orders.filter((o) => o.status === col.id)
        return (
          <div className="kanban-col" key={col.id}>
            <div className="kanban-header">
              <div className="kanban-title">
                <span className={`status-dot ${col.dot}`}></span> {col.label}
              </div>
              <span className="kanban-count">{colOrders.length}</span>
            </div>
            <div className="kanban-body">
              {colOrders.map((order) => (
                <div className="order-card" key={order.id}>
                  <div className="order-card-top">
                    <Link href={`/dashboard/pedidos/${order.id}`} className="order-num" title="Abrir ficha do pedido">
                      {fmtOrderNumber(order.order_number, order.id)}
                    </Link>
                    <div className="order-time">
                      {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className="order-tags">
                    <span className="order-tag">{ORDER_TYPE_LABEL[order.order_type]}</span>
                    {order.payment_method && <span className="order-tag">{PAYMENT_LABEL[order.payment_method]}</span>}
                  </div>

                  <div className="order-client">{order.customer_name}</div>

                  {order.order_type === 'delivery' && order.address_street && (
                    <div className="order-addr">
                      📍 {order.address_street}, {order.address_number} — {order.address_neighborhood}
                      {order.address_cep ? ` · CEP ${order.address_cep}` : ''}
                    </div>
                  )}
                  {order.order_type === 'dine_in' && order.table_number && (
                    <div className="order-addr">🍽 Mesa {order.table_number}</div>
                  )}

                  <div className="order-items">
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

                  <div className="order-footer">
                    <div className="order-price">{fmtCents(order.total_cents)}</div>
                    <Link href={`/dashboard/pedidos/${order.id}`} className="order-detail-link" title="Ver ficha / imprimir">
                      Ficha →
                    </Link>
                  </div>

                  {order.customer_phone && (
                    <button
                      className="notify-btn"
                      onClick={() =>
                        window.open(
                          `https://wa.me/${waPhone(order.customer_phone!)}?text=${encodeURIComponent(statusMessage(order, storeName))}`,
                          '_blank'
                        )
                      }
                      title="Enviar atualização pelo WhatsApp"
                    >
                      <span className="notify-btn-icon">💬</span> Avisar cliente
                    </button>
                  )}

                  {col.next && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="advance-btn" style={{ flex: 1 }} onClick={() => advanceOrder(order.id, order.status, order.order_type)}>
                        {nextLabel(col, order.order_type)} →
                      </button>
                      <button className="advance-btn" style={{ flex: 'none', padding: '0 10px', background: 'var(--red-l)', color: 'var(--red)' }} onClick={() => cancelOrder(order.id)} title="Cancelar">
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )
}
