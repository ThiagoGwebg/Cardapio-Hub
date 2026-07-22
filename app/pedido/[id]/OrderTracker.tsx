'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtCents, fmtOrderNumber, ORDER_TYPE_LABEL, PAYMENT_LABEL, STATUS_LABEL, PIX_KEY_TYPE_LABEL } from '@/lib/format'
import { saveOrderToHistory } from '@/lib/orderHistory'
import PushNotificationPrompt from '@/components/PushNotificationPrompt'
import '@/app/loja/[slug]/loja.css'

type OrderItem = { name: string; quantity: number; unit_price_cents: number; options: string[] }
type Order = {
  id: string
  order_number: number | null
  status: string
  order_type: string
  created_at: string
  customer_name: string
  subtotal_cents: number
  delivery_fee_cents: number
  discount_cents: number
  total_cents: number
  payment_method: string | null
  payment_status?: string | null
  payment?: {
    method: string | null
    status: string | null
    qr_code: string | null
    qr_code_base64: string | null
    ticket_url: string | null
    expires_at: string | null
  } | null
  store_name: string
  store_slug: string
  estimated_prep_min: number
  estimated_delivery_min: number
  pix_key: string | null
  pix_key_type: string | null
  items: OrderItem[]
}

const FLOW_DELIVERY = ['novo', 'preparando', 'pronto', 'a_caminho', 'concluido']
const FLOW_OTHER = ['novo', 'preparando', 'pronto', 'concluido']

const STEP_ICON: Record<string, string> = {
  novo: '🧾',
  preparando: '👨‍🍳',
  pronto: '📦',
  a_caminho: '🛵',
  concluido: '🎉',
}

function estimatedArrival(createdAt: string, etaMin: number) {
  const arrival = new Date(new Date(createdAt).getTime() + etaMin * 60000)
  return arrival.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function heroFor(status: string, orderType: string): { icon: string; title: string; sub: string } {
  switch (status) {
    case 'agendado':
      return { icon: '📅', title: 'Pedido agendado', sub: 'A loja vai preparar seu pedido na data e hora combinadas.' }
    case 'novo':
      return { icon: '✅', title: 'Pedido recebido!', sub: 'A loja já foi avisada e vai começar o preparo.' }
    case 'preparando':
      return { icon: '👨‍🍳', title: 'Preparando seu pedido', sub: 'Tá rolando na cozinha agora mesmo.' }
    case 'pronto':
      return orderType === 'delivery'
        ? { icon: '📦', title: 'Pedido pronto!', sub: 'Logo, logo sai para entrega.' }
        : orderType === 'dine_in'
          ? { icon: '🎉', title: 'Pedido pronto!', sub: 'Já vai ser levado até você.' }
          : { icon: '🎉', title: 'Pronto para retirada!', sub: 'Pode vir buscar quando quiser.' }
    case 'a_caminho':
      return { icon: '🛵', title: 'Saiu para entrega', sub: 'Seu pedido está a caminho. Fica de olho!' }
    case 'concluido':
      return { icon: '🎉', title: 'Pedido concluído', sub: 'Bom apetite! Obrigado pela preferência.' }
    default:
      return { icon: '🧾', title: 'Acompanhe seu pedido', sub: '' }
  }
}

export default function OrderTracker({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [pixCopied, setPixCopied] = useState(false)
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light')
  const [payError, setPayError] = useState(false)
  // Relógio só pra detectar a expiração do Pix sem chamar Date.now() no render (pureza do React).
  const [now, setNow] = useState(0)

  useEffect(() => {
    if (order?.store_slug) {
      const saved = localStorage.getItem(`storefront-theme-${order.store_slug}`)
      if (saved === 'dark' || saved === 'light') {
        setThemeMode(saved)
      } else {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setThemeMode(isSystemDark ? 'dark' : 'light')
      }
    } else {
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setThemeMode(isSystemDark ? 'dark' : 'light')
    }
  }, [order?.store_slug])

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.rpc('get_order', { p_id: orderId })
    if (data) {
      const o = data as Order
      setOrder(o)
      saveOrderToHistory({ id: o.id, storeSlug: o.store_slug, storeName: o.store_name, createdAt: o.created_at })
    }
    setLoading(false)
  }, [orderId])

  function copyLink() {
    if (typeof window === 'undefined') return
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Enquanto aguarda pagamento, atualiza mais rápido pra confirmar assim que cair o Pix.
  const awaitingPayment = order?.payment_status === 'pending'
  useEffect(() => {
    load()
    const tick = () => {
      setNow(Date.now())
      load()
    }
    const t = setInterval(tick, awaitingPayment ? 4000 : 15000)
    return () => clearInterval(t)
  }, [load, awaitingPayment])

  // Gera a cobrança Pix quando falta QR OU quando o QR atual já expirou (aí o servidor cria um novo).
  const pay = order?.payment
  const chargeExpired = !!pay?.expires_at && now > 0 && new Date(pay.expires_at).getTime() < now
  const needsCharge = awaitingPayment && (!pay?.qr_code || chargeExpired)

  const payInFlightRef = useRef(false)
  const generatePix = useCallback(async () => {
    if (payInFlightRef.current) return
    payInFlightRef.current = true
    setPayError(false)
    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, { method: 'POST' })
      if (!res.ok) {
        // fetch NÃO rejeita em 4xx/5xx: precisamos checar res.ok pra não travar no spinner.
        setPayError(true)
        return
      }
      await load()
    } catch {
      setPayError(true)
    } finally {
      payInFlightRef.current = false
    }
  }, [orderId, load])

  useEffect(() => {
    if (needsCharge && !payError) generatePix()
  }, [needsCharge, payError, generatePix])

  if (loading)
    return (
      <div className={`storefront storefront-${themeMode} track-page`}>
        <div className="track-shell">
          <div className="track-hero track-hero--loading">
            <span className="track-spinner" />
            <div className="track-hero-sub">Carregando seu pedido…</div>
          </div>
        </div>
      </div>
    )
  if (!order)
    return (
      <div className={`storefront storefront-${themeMode} track-page`}>
        <div className="track-shell">
          <div className="track-hero">
            <span className="track-hero-icon">🔍</span>
            <div className="track-hero-title">Pedido não encontrado</div>
            <div className="track-hero-sub">O link pode estar incompleto ou o pedido foi removido.</div>
          </div>
        </div>
      </div>
    )

  // Pedido com pagamento online pendente: mostra o Pix e segura o pedido até confirmar.
  if (awaitingPayment) {
    const initialLetter = (order.store_name || '?').trim().charAt(0).toUpperCase()
    const showQr = !!pay?.qr_code && !chargeExpired
    return (
      <div className={`storefront storefront-${themeMode} track-page`}>
        <div className="track-shell">
          <div className="track-top">
            <div className="track-store-badge">{initialLetter}</div>
            <div className="track-top-info">
              <div className="track-store">{order.store_name}</div>
              <div className="track-order-num">Pedido {fmtOrderNumber(order.order_number, order.id)}</div>
            </div>
          </div>

          <div className="track-hero">
            <span className="track-hero-icon">⏳</span>
            <div className="track-hero-title">Pague com Pix pra confirmar</div>
            <div className="track-hero-sub">
              Seu pedido só é enviado para a loja depois do pagamento — e a confirmação é automática.
            </div>
          </div>

          <div className="track-card">
            {payError ? (
              <div className="track-hero">
                <span className="track-hero-icon">⚠️</span>
                <div className="track-hero-sub" style={{ marginBottom: 12 }}>
                  Não foi possível gerar o Pix agora. Verifique sua conexão e tente de novo.
                </div>
                <button className="track-copy-btn" onClick={() => setPayError(false)}>
                  Tentar novamente
                </button>
              </div>
            ) : showQr ? (
              <>
                {pay?.qr_code_base64 && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/png;base64,${pay.qr_code_base64}`}
                    alt="QR Code Pix"
                    style={{ width: 220, height: 220, maxWidth: '100%', display: 'block', margin: '4px auto 12px' }}
                  />
                )}
                <div className="pix-key-box">
                  <span className="pix-key-label">Pix copia e cola</span>
                  <div className="pix-key-row">
                    <span className="pix-key-value">{pay!.qr_code}</span>
                    <button
                      className="pix-copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(pay!.qr_code!)
                        setPixCopied(true)
                        setTimeout(() => setPixCopied(false), 2000)
                      }}
                    >
                      {pixCopied ? '✓' : 'Copiar'}
                    </button>
                  </div>
                  <p className="pix-key-hint">
                    No app do seu banco, escolha Pix e pague pelo QR Code ou pelo copia e cola. Assim que
                    o pagamento cair, esta tela atualiza sozinha.
                  </p>
                </div>
              </>
            ) : (
              <div className="track-hero track-hero--loading">
                <span className="track-spinner" />
                <div className="track-hero-sub">Gerando seu Pix…</div>
              </div>
            )}

            <div className="track-totals">
              <div className="track-total-row track-total-final">
                <span>Total</span>
                <span>{fmtCents(order.total_cents)}</span>
              </div>
            </div>
          </div>

          <div className="track-actions">
            <a className="track-back-btn" href={`/loja/${order.store_slug}`}>Voltar ao cardápio</a>
          </div>
          <p className="track-hint">Guarde este link para acompanhar o pedido depois do pagamento.</p>
        </div>
      </div>
    )
  }

  const flow = order.order_type === 'delivery' ? FLOW_DELIVERY : FLOW_OTHER
  const canceled = order.status === 'cancelado'
  const currentIdx = flow.indexOf(order.status)
  const eta = order.order_type === 'delivery' ? order.estimated_delivery_min : order.estimated_prep_min
  const hero = heroFor(order.status, order.order_type)
  const initial = (order.store_name || '?').trim().charAt(0).toUpperCase()
  const placed = new Date(order.created_at).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`storefront storefront-${themeMode} track-page`}>
      <div className="track-shell">
        {/* Cabeçalho da loja */}
        <div className="track-top">
          <div className="track-store-badge">{initial}</div>
          <div className="track-top-info">
            <div className="track-store">{order.store_name}</div>
            <div className="track-order-num">
              Pedido {fmtOrderNumber(order.order_number, order.id)} · {placed}
            </div>
          </div>
        </div>

        {/* Hero de status */}
        {canceled ? (
          <div className="track-hero track-hero--canceled">
            <span className="track-hero-icon">✖️</span>
            <div className="track-hero-title">Pedido cancelado</div>
            <div className="track-hero-sub">Se ficou alguma dúvida, fale direto com a loja.</div>
          </div>
        ) : (
          <div className="track-hero">
            <span className="track-hero-icon">{hero.icon}</span>
            <div className="track-hero-title">{hero.title}</div>
            {hero.sub && <div className="track-hero-sub">{hero.sub}</div>}
            {order.status !== 'concluido' && (
              <div className="track-eta">
                <span className="track-eta-label">Tempo estimado</span>
                <span className="track-eta-value">~{eta} min</span>
                <span className="track-eta-clock">Previsão: até {estimatedArrival(order.created_at, eta)}</span>
              </div>
            )}
          </div>
        )}

        {/* Stepper de progresso */}
        {!canceled && (
          <div className="track-card track-steps">
            {flow.map((s, i) => {
              const done = i < currentIdx
              const current = i === currentIdx
              return (
                <div key={s} className={`track-step ${done ? 'done' : ''} ${current ? 'current' : ''}`}>
                  <div className="track-step-icon">{done ? '✓' : STEP_ICON[s]}</div>
                  <div className="track-step-body">
                    <span className="track-step-label">{STATUS_LABEL[s]}</span>
                    {current && <span className="track-step-now">Agora</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Chave Pix */}
        {!canceled && order.payment_method === 'pix' && order.pix_key && (
          <div className="pix-key-box">
            <span className="pix-key-label">
              Chave Pix da loja{order.pix_key_type ? ` (${PIX_KEY_TYPE_LABEL[order.pix_key_type]})` : ''}
            </span>
            <div className="pix-key-row">
              <span className="pix-key-value">{order.pix_key}</span>
              <button
                className="pix-copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(order.pix_key!)
                  setPixCopied(true)
                  setTimeout(() => setPixCopied(false), 2000)
                }}
              >
                {pixCopied ? '✓' : 'Copiar'}
              </button>
            </div>
            <p className="pix-key-hint">Se ainda não pagou, envie o Pix pra essa chave e mostre o comprovante na retirada/entrega.</p>
          </div>
        )}

        {/* Resumo do pedido */}
        <div className="track-card">
          <div className="track-section-title">Resumo do pedido</div>
          <div className="track-items">
            {order.items.map((it, i) => (
              <div className="track-item" key={i}>
                <span className="track-item-qty">{it.quantity}×</span>
                <span className="track-item-name">
                  {it.name}
                  {it.options.length > 0 && <span className="track-item-opts">{it.options.join(', ')}</span>}
                </span>
                <span className="track-item-price">{fmtCents(it.unit_price_cents * it.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="track-totals">
            <div className="track-total-row"><span>Subtotal</span><span>{fmtCents(order.subtotal_cents)}</span></div>
            {order.delivery_fee_cents > 0 && (
              <div className="track-total-row"><span>Entrega</span><span>{fmtCents(order.delivery_fee_cents)}</span></div>
            )}
            {order.discount_cents > 0 && (
              <div className="track-total-row track-total-discount"><span>Desconto</span><span>− {fmtCents(order.discount_cents)}</span></div>
            )}
            <div className="track-total-row track-total-final"><span>Total</span><span>{fmtCents(order.total_cents)}</span></div>
          </div>

          <div className="track-meta-chips">
            <span className="track-chip">{ORDER_TYPE_LABEL[order.order_type]}</span>
            {order.payment_method && <span className="track-chip">{PAYMENT_LABEL[order.payment_method]}</span>}
          </div>
        </div>

        {/* Ações */}
        <div className="track-actions">
          <button className="track-copy-btn" onClick={copyLink}>
            {copied ? '✓ Link copiado' : '🔗 Salvar link do pedido'}
          </button>
          <a className="track-back-btn" href={`/loja/${order.store_slug}`}>Voltar ao cardápio</a>
        </div>
        <p className="track-hint">
          Guarde este link pra acompanhar depois. No cardápio, toque em <b>“Meus pedidos”</b> no topo pra ver seus pedidos deste navegador.
        </p>
      </div>

      {!canceled && order.status !== 'concluido' && (
        <PushNotificationPrompt
          scope="pedido"
          tags={{ role: 'cliente', store_slug: order.store_slug, order_id: order.id }}
          storageKey={order.id}
          title="Quer saber quando seu pedido avançar?"
          subtitle="Ative as notificações e acompanhe sem precisar ficar atualizando a página."
        />
      )}
    </div>
  )
}
