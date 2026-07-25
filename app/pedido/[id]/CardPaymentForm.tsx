'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

// Card Payment Brick do Mercado Pago: o cartão é tokenizado no navegador com a
// public_key do LOJISTA (mesma conta que cria a cobrança) — os dados do cartão
// nunca passam pelo nosso servidor.

type MpBrickController = { unmount: () => void }

type MpCardFormData = {
  token: string
  payment_method_id: string
  issuer_id?: string
  installments?: number
  payer?: { email?: string; identification?: { type?: string; number?: string } }
}

declare global {
  interface Window {
    MercadoPago?: new (
      publicKey: string,
      opts?: { locale?: string }
    ) => {
      bricks: () => {
        create: (
          brick: 'cardPayment',
          containerId: string,
          settings: unknown
        ) => Promise<MpBrickController>
      }
    }
  }
}

let sdkPromise: Promise<void> | null = null
function loadMpSdk(): Promise<void> {
  if (window.MercadoPago) return Promise.resolve()
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://sdk.mercadopago.com/js/v2'
      s.onload = () => resolve()
      s.onerror = () => {
        sdkPromise = null
        reject(new Error('Falha ao carregar o Mercado Pago'))
      }
      document.head.appendChild(s)
    })
  }
  return sdkPromise
}

// Mensagens amigáveis pros motivos de recusa mais comuns do MP.
const REJECT_MSG: Record<string, string> = {
  cc_rejected_insufficient_amount: 'Cartão sem limite suficiente. Tente outro cartão.',
  cc_rejected_bad_filled_card_number: 'Confira o número do cartão.',
  cc_rejected_bad_filled_date: 'Confira a validade do cartão.',
  cc_rejected_bad_filled_security_code: 'Confira o código de segurança (CVV).',
  cc_rejected_bad_filled_other: 'Confira os dados do cartão.',
  cc_rejected_call_for_authorize: 'O banco não autorizou. Ligue para o banco ou tente outro cartão.',
  cc_rejected_card_disabled: 'Cartão desativado. Fale com o banco ou use outro cartão.',
  cc_rejected_duplicated_payment: 'Pagamento duplicado. Aguarde a confirmação ou fale com a loja.',
  cc_rejected_high_risk: 'Pagamento recusado por segurança. Tente outro cartão ou pague com Pix.',
}

export default function CardPaymentForm({
  orderId,
  onPaid,
  onProcessing,
}: {
  orderId: string
  onPaid: () => void
  onProcessing: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [rejectMsg, setRejectMsg] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  // Muda a cada retry pra remontar o brick do zero.
  const [attempt, setAttempt] = useState(0)
  const controllerRef = useRef<MpBrickController | null>(null)

  useEffect(() => {
    let cancelled = false

    async function mount() {
      setError(null)
      setReady(false)
      try {
        const res = await fetch(`/api/orders/${orderId}/pay`)
        if (!res.ok) throw new Error('config')
        const cfg = (await res.json()) as { public_key: string; amount_cents: number }
        await loadMpSdk()
        if (cancelled || !window.MercadoPago) return

        const mp = new window.MercadoPago(cfg.public_key, { locale: 'pt-BR' })
        const controller = await mp.bricks().create('cardPayment', 'mp-card-brick', {
          initialization: { amount: cfg.amount_cents / 100 },
          customization: {
            paymentMethods: { maxInstallments: 12 },
            visual: { style: { theme: 'default' } },
          },
          callbacks: {
            onReady: () => {
              if (!cancelled) setReady(true)
            },
            onError: () => {
              if (!cancelled) setError('Não foi possível carregar o formulário do cartão.')
            },
            onSubmit: async (formData: MpCardFormData) => {
              setRejectMsg(null)
              const pay = await fetch(`/api/orders/${orderId}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
              })
              const data = await pay.json().catch(() => ({}))
              if (pay.ok && data.status === 'paid') {
                onPaid()
                return
              }
              if (pay.ok && data.status === 'pending') {
                // Em análise: o webhook confirma; a tela do pedido segue no polling.
                onProcessing()
                return
              }
              const detail: string | undefined = data.status_detail
              setRejectMsg(
                (detail && REJECT_MSG[detail]) ||
                  'Pagamento recusado. Confira os dados ou tente outro cartão.'
              )
              // Rejeitar a promise faz o brick sair do estado "processando" e liberar o form.
              throw new Error(detail || 'rejected')
            },
          },
        })
        if (cancelled) {
          controller.unmount()
          return
        }
        controllerRef.current = controller
      } catch {
        if (!cancelled) setError('Não foi possível carregar o formulário do cartão.')
      }
    }

    mount()
    return () => {
      cancelled = true
      controllerRef.current?.unmount()
      controllerRef.current = null
    }
  }, [orderId, attempt, onPaid, onProcessing])

  if (error) {
    return (
      <div className="pay-state">
        <span className="pay-state-icon pay-state-icon--error" aria-hidden>
          <AlertTriangle size={26} strokeWidth={2} />
        </span>
        <div className="pay-state-title">Não foi possível carregar o pagamento</div>
        <div className="pay-state-sub">Verifique sua conexão e tente novamente.</div>
        <button className="pay-retry-btn" onClick={() => setAttempt((a) => a + 1)}>
          <RefreshCw size={15} strokeWidth={2.2} />
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div>
      {!ready && (
        <div className="pay-state">
          <span className="track-spinner" />
          <div className="pay-state-title" style={{ marginTop: 14 }}>Carregando pagamento…</div>
          <div className="pay-state-sub">Leva só um instante.</div>
        </div>
      )}
      {rejectMsg && (
        <div className="pay-reject" role="alert">
          <AlertTriangle size={16} strokeWidth={2.3} />
          <div>
            <strong>Pagamento recusado</strong>
            <p>{rejectMsg}</p>
          </div>
        </div>
      )}
      {/* O container precisa existir no DOM pro Brick montar, mas fica oculto até ficar
          pronto: o Mercado Pago desenha o próprio esqueleto cinza e ele aparecia embaixo
          do nosso spinner, deixando a tela com dois carregamentos ao mesmo tempo. */}
      <div id="mp-card-brick" style={{ display: ready ? 'block' : 'none' }} />
    </div>
  )
}
