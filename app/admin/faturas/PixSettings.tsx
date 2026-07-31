'use client'

import { useState, useTransition } from 'react'
import { QrCode, Check, AlertTriangle } from 'lucide-react'
import { fmtCents } from '@/lib/format'
import { savePixPayload, saveEmitDaysBefore } from './actions'

type Props = {
  initial: { free: string | null; pro: string | null }
  /** Preço padrão de cada plano, para avisar quando o valor do QR não bate. */
  expected: { free: number; pro: number }
  /** Dias antes do vencimento em que a fatura é emitida e o lojista avisado. */
  emitDaysBefore: number
}

const PLANS: { key: 'pro' | 'free'; label: string }[] = [
  { key: 'pro', label: 'Pro' },
  { key: 'free', label: 'Lite' },
]

export default function PixSettings({ initial, expected, emitDaysBefore }: Props) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState(initial)
  const [days, setDays] = useState(String(emitDaysBefore))
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mismatch, setMismatch] = useState<Record<string, number | null>>({})
  const [pending, startTransition] = useTransition()

  function save(plan: 'free' | 'pro') {
    setError(null)
    setSaved(null)
    startTransition(async () => {
      const res = await savePixPayload(plan, values[plan] ?? '')
      if (!res.ok) {
        setError(res.error || 'Erro ao salvar.')
        return
      }
      setSaved(plan)
      setMismatch((m) => ({ ...m, [plan]: res.amountCents ?? null }))
    })
  }

  function saveDays() {
    setError(null)
    setSaved(null)
    startTransition(async () => {
      const res = await saveEmitDaysBefore(Number(days))
      if (!res.ok) setError(res.error || 'Erro ao salvar.')
      else setSaved('days')
    })
  }

  return (
    <div className="adm-panel" style={{ marginBottom: 16 }}>
      <button className="adm-settings-head" onClick={() => setOpen((v) => !v)}>
        <QrCode size={16} strokeWidth={2.3} />
        <strong>Configuração da cobrança</strong>
        <span style={{ fontSize: 11, opacity: 0.6 }}>
          {values.pro ? 'Pro ✓' : 'Pro —'} · {values.free ? 'Lite ✓' : 'Lite —'} · avisa {emitDaysBefore}d antes
        </span>
      </button>

      {open && (
        <div className="adm-settings-body">
          <label className="adm-field">
            Avisar o lojista quantos dias antes do vencimento
            <span className="adm-field-row">
              <input
                value={days}
                onChange={(e) => setDays(e.target.value)}
                inputMode="numeric"
                style={{ maxWidth: 90 }}
              />
              <button className="adm-btn pro" onClick={saveDays} disabled={pending}>
                Salvar
              </button>
              {saved === 'days' && (
                <span style={{ color: 'var(--green)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={12} strokeWidth={2.6} /> Salvo
                </span>
              )}
            </span>
            <span className="adm-field-hint">
              A fatura é emitida nesse dia e o e-mail sai junto. Depois disso, o lojista ainda
              recebe aviso no vencimento e um último 2 dias antes de sair do ar.
            </span>
          </label>

          <p className="adm-field-hint" style={{ margin: 0 }}>
            Cole aqui o <b>Pix copia e cola</b> gerado no seu banco (não o print). O sistema desenha
            o QR sozinho e ainda oferece o botão de copiar, que é como a maioria vai pagar pelo celular.
          </p>

          {PLANS.map(({ key, label }) => {
            const amount = mismatch[key]
            const differs = amount != null && amount !== expected[key]
            return (
              <label key={key} className="adm-field">
                Código Pix do plano {label} ({fmtCents(expected[key])})
                <textarea
                  rows={3}
                  value={values[key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                  placeholder="00020126330014br.gov.bcb.pix..."
                />
                <span className="adm-field-row">
                  <button className="adm-btn pro" onClick={() => save(key)} disabled={pending}>
                    Salvar {label}
                  </button>
                  {saved === key && !differs && (
                    <span style={{ color: 'var(--green)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Check size={12} strokeWidth={2.6} /> Salvo
                    </span>
                  )}
                  {differs && (
                    <span style={{ color: 'var(--amber)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={12} strokeWidth={2.4} />
                      QR é de {fmtCents(amount)}, plano cobra {fmtCents(expected[key])}
                    </span>
                  )}
                </span>
              </label>
            )
          })}
        </div>
      )}

      {error && <p className="adm-toggle-error">{error}</p>}
    </div>
  )
}
