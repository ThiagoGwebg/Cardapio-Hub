'use client'

import { useState, useTransition } from 'react'
import { CircleDollarSign, Power, RotateCcw, Wrench } from 'lucide-react'
import { fmtCents } from '@/lib/format'
import { setStoreBilling, reactivateStore, setSetupUnlocked } from './actions'

export type BillingInfo = {
  enabled: boolean
  status: 'current' | 'past_due' | 'suspended'
  /** Derivado do plano no banco (price_for_plan) — não é digitável. */
  priceCents: number
  planLabel: string
  nextDueDate: string | null
  graceDays: number
  /** Painel liberado para montagem assistida antes do 1º pagamento. */
  setupUnlocked: boolean
}

const STATUS_LABEL: Record<BillingInfo['status'], { text: string; color: string }> = {
  current: { text: 'Em dia', color: 'var(--green)' },
  past_due: { text: 'Atrasado', color: 'var(--amber)' },
  suspended: { text: 'Suspensa', color: 'var(--red)' },
}

/** Controle da mensalidade que a loja paga PARA A PLATAFORMA. */
export default function BillingControl({ storeId, billing }: { storeId: string; billing: BillingInfo }) {
  const [open, setOpen] = useState(false)
  const [dueDate, setDueDate] = useState(billing.nextDueDate ?? '')
  const [grace, setGrace] = useState(String(billing.graceDays))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const status = STATUS_LABEL[billing.status]

  function save(enabled: boolean) {
    setError(null)
    startTransition(async () => {
      const res = await setStoreBilling(storeId, {
        enabled,
        nextDueDate: dueDate || undefined,
        graceDays: Number(grace) || 0,
      })
      if (!res.ok) setError(res.error || 'Erro ao salvar a cobrança.')
      else setOpen(false)
    })
  }

  function toggleSetup() {
    setError(null)
    startTransition(async () => {
      const res = await setSetupUnlocked(storeId, !billing.setupUnlocked)
      if (!res.ok) setError(res.error || 'Erro ao liberar o painel.')
    })
  }

  function reactivate() {
    if (!window.confirm('Religar a loja e CANCELAR as faturas em aberto? Use só em acordo por fora.')) return
    setError(null)
    startTransition(async () => {
      const res = await reactivateStore(storeId)
      if (!res.ok) setError(res.error || 'Erro ao religar.')
    })
  }

  return (
    <span className="adm-plan-toggle">
      <button className="adm-btn ghost" onClick={() => setOpen((v) => !v)} disabled={pending}>
        <CircleDollarSign size={13} strokeWidth={2.4} />{' '}
        {billing.enabled ? (
          <span style={{ color: status.color }}>
            {status.text}
            {billing.setupUnlocked && ' · montagem'}
          </span>
        ) : (
          'Cobrança off'
        )}
      </button>

      {billing.status === 'suspended' && (
        <>
          <button
            className="adm-btn ghost"
            onClick={toggleSetup}
            disabled={pending}
            title="Abre o painel para montar o cardápio junto com o cliente. O cardápio público continua fora do ar até o pagamento."
          >
            <Wrench size={13} strokeWidth={2.4} />{' '}
            {billing.setupUnlocked ? 'Fechar montagem' : 'Liberar montagem'}
          </button>
          <button className="adm-btn ghost" onClick={reactivate} disabled={pending}>
            <RotateCcw size={13} strokeWidth={2.4} /> Religar
          </button>
        </>
      )}

      {open && (
        <div className="adm-settings-body" style={{ gap: 8, width: '100%' }}>
          <div className="adm-field">
            Mensalidade
            <strong style={{ fontSize: 16, color: 'var(--ink)' }}>
              {fmtCents(billing.priceCents)}/mês · plano {billing.planLabel}
            </strong>
            <span className="adm-field-hint">
              Definido pelo plano. Para mudar o valor, mude o plano da loja.
            </span>
          </div>
          <label className="adm-field">
            Próximo vencimento
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <span className="adm-field-hint">
              Preenchido automaticamente na criação da conta (30 dias). Só mexa em caso de acordo.
            </span>
          </label>
          <label className="adm-field">
            Carência (dias após vencer antes de suspender)
            <input value={grace} onChange={(e) => setGrace(e.target.value)} inputMode="numeric" />
          </label>

          <div className="adm-field-row">
            <button className="adm-btn pro" onClick={() => save(true)} disabled={pending}>
              <Power size={13} strokeWidth={2.4} /> {billing.enabled ? 'Salvar' : 'Ligar cobrança'}
            </button>
            {billing.enabled && (
              <button className="adm-btn ghost" onClick={() => save(false)} disabled={pending}>
                Desligar cobrança
              </button>
            )}
          </div>
          <p className="adm-field-hint" style={{ margin: 0 }}>
            Com a cobrança ligada, a fatura é emitida alguns dias antes do vencimento e o cardápio
            sai do ar depois da carência.
          </p>
        </div>
      )}

      {error && <span className="adm-toggle-error">{error}</span>}
    </span>
  )
}
