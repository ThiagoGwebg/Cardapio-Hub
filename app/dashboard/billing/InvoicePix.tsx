'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Copy, Check, AlertTriangle, Clock, RefreshCw } from 'lucide-react'
import { claimInvoicePayment } from './actions'

type Props = {
  amountLabel: string
  dueLabel: string
  overdue: boolean
  /** Nome de vitrine do plano (Lite/Pro) — o QR mostrado é o desse plano. */
  planLabel: string
  /** Payload Pix copia e cola da plataforma (QR estático do banco). */
  pixPayload: string | null
  /** PNG do QR renderizado no servidor a partir do payload. */
  qrDataUrl: string | null
  /** Lojista já declarou o pagamento e aguarda conferência. */
  awaitingConfirmation: boolean
  /** Abre já com o QR aberto (tela de loja suspensa: não faz sentido esconder). */
  startOpen?: boolean
}

export default function InvoicePix({
  amountLabel,
  dueLabel,
  overdue,
  planLabel,
  pixPayload,
  qrDataUrl,
  awaitingConfirmation,
  startOpen = false,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [claimed, setClaimed] = useState(awaitingConfirmation)
  const [showPix, setShowPix] = useState(startOpen)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function copy() {
    if (!pixPayload) return
    navigator.clipboard.writeText(pixPayload).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function claim() {
    if (!window.confirm('Confirmar que você já enviou o Pix desta mensalidade?')) return
    setError(null)
    startTransition(async () => {
      const res = await claimInvoicePayment()
      if (res.ok) setClaimed(true)
      else setError(res.error || 'Não foi possível registrar.')
    })
  }

  if (claimed) {
    return (
      <div className="settings-card" style={{ borderLeft: '4px solid var(--green)' }}>
        <div className="settings-section-title" style={{ color: 'var(--green)' }}>
          Pagamento em conferência
        </div>
        <p style={{ fontSize: 13, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={15} strokeWidth={2.2} />
          Recebemos seu aviso de pagamento de {amountLabel}. Assim que confirmarmos no extrato,
          seu plano é renovado — normalmente no mesmo dia.
        </p>
      </div>
    )
  }

  return (
    <div className="settings-card">
      <div className="settings-section-title">
        {overdue ? 'Mensalidade em atraso' : 'Mensalidade em aberto'}
      </div>

      <p style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Nunito, sans-serif', marginBottom: 4 }}>
        {amountLabel}
      </p>
      <p
        style={{
          fontSize: 12,
          color: overdue ? 'var(--red)' : 'var(--muted)',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {overdue && <AlertTriangle size={14} strokeWidth={2.2} />}
        {overdue ? `Venceu em ${dueLabel}` : `Vence em ${dueLabel}`}
      </p>

      {error && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</p>}

      {!pixPayload ? (
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
          A forma de pagamento ainda não foi configurada. Fale com a gente pelo WhatsApp.
        </p>
      ) : !showPix ? (
        <>
          <button type="button" className="save-btn" onClick={() => setShowPix(true)}>
            <RefreshCw size={15} strokeWidth={2.3} /> Renovar plano {planLabel}
          </button>
          <p style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 10 }}>
            Pagamento por Pix — o QR Code do seu plano aparece aqui.
          </p>
        </>
      ) : (
        <>
          {qrDataUrl && (
            <Image
              src={qrDataUrl}
              alt="QR Code do Pix da mensalidade"
              width={200}
              height={200}
              unoptimized
              style={{ display: 'block', margin: '0 auto 12px', borderRadius: 10, background: '#fff' }}
            />
          )}

          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
            Pix do plano <b>{planLabel}</b> — escaneie o QR Code ou use o copia e cola:
          </p>
          <div
            style={{
              fontSize: 11,
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              background: 'var(--surface-2, #f6f6f8)',
              padding: 10,
              borderRadius: 8,
              marginBottom: 10,
              maxHeight: 90,
              overflow: 'auto',
            }}
          >
            {pixPayload}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="save-btn" onClick={copy}>
              {copied ? <Check size={15} strokeWidth={2.4} /> : <Copy size={15} strokeWidth={2.2} />}
              {copied ? ' Copiado!' : ' Copiar código Pix'}
            </button>
            <button
              type="button"
              className="save-btn"
              onClick={claim}
              disabled={pending}
              style={{ background: 'var(--green)' }}
            >
              <Check size={15} strokeWidth={2.4} /> {pending ? ' Enviando…' : ' Já paguei'}
            </button>
          </div>

          <p style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 10 }}>
            Depois de pagar, toque em <b>Já paguei</b>. Conferimos e liberamos seu plano —
            normalmente no mesmo dia.
          </p>
        </>
      )}
    </div>
  )
}
