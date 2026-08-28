'use client'

import { useState, useTransition } from 'react'
import { Star } from 'lucide-react'
import type { BillingPlan } from '@/lib/billing/plans'
import { setStorePlan } from './actions'

const OPTIONS: { key: BillingPlan; label: string }[] = [
  { key: 'free', label: 'Lite' },
  { key: 'plus', label: 'Plus' },
  { key: 'pro', label: 'Pro' },
]

/* Seletor de três estados. Deixou de ser um botão de liga/desliga porque com o
   Plus no meio "Rebaixar/Ativar" não descreve mais o destino — o admin precisa
   escolher pra QUAL plano vai, não apenas alternar. */
export default function PlanToggle({ storeId, plan }: { storeId: string; plan: BillingPlan }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function change(target: BillingPlan) {
    if (target === plan) return
    const from = OPTIONS.find((o) => o.key === plan)?.label
    const to = OPTIONS.find((o) => o.key === target)?.label
    if (!window.confirm(`Mudar essa loja do plano ${from} para ${to}?`)) return
    setError(null)
    startTransition(async () => {
      const res = await setStorePlan(storeId, target)
      if (!res.ok) setError(res.error || 'Erro ao trocar o plano.')
    })
  }

  return (
    <span className="adm-plan-toggle">
      {OPTIONS.map(({ key, label }) => (
        <button
          key={key}
          className={`adm-btn ${key === plan ? 'pro' : 'ghost'}`}
          onClick={() => change(key)}
          disabled={pending || key === plan}
          aria-pressed={key === plan}
          title={key === plan ? `Plano atual: ${label}` : `Mudar para ${label}`}
        >
          {pending && key !== plan ? '…' : (
            <>
              {key === 'pro' && <Star size={13} strokeWidth={2.6} />} {label}
            </>
          )}
        </button>
      ))}
      {error && <span className="adm-toggle-error">{error}</span>}
    </span>
  )
}
