'use client'

import { useState, useTransition } from 'react'
import { Star } from 'lucide-react'
import { setStorePlan } from './actions'

export default function PlanToggle({ storeId, isPro }: { storeId: string; isPro: boolean }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function toggle() {
    const target = isPro ? 'free' : 'pro'
    const label = isPro ? 'voltar pro plano Lite' : 'ativar o Pro'
    if (!window.confirm(`Tem certeza que quer ${label} pra essa loja?`)) return
    setError(null)
    startTransition(async () => {
      const res = await setStorePlan(storeId, target)
      if (!res.ok) setError(res.error || 'Erro ao trocar o plano.')
    })
  }

  return (
    <span className="adm-plan-toggle">
      <button
        className={`adm-btn ${isPro ? 'ghost' : 'pro'}`}
        onClick={toggle}
        disabled={pending}
      >
        {pending ? (
          '…'
        ) : isPro ? (
          'Rebaixar p/ Lite'
        ) : (
          <>
            <Star size={13} strokeWidth={2.6} /> Ativar Pro
          </>
        )}
      </button>
      {error && <span className="adm-toggle-error">{error}</span>}
    </span>
  )
}
