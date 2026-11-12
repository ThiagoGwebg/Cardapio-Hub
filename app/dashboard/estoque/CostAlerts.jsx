'use client'

import { useTransition } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { ackCostAlert } from './actions'
import { fmtMoney } from '@/lib/stock/format'

// Itens de nota lançada cujo custo mudou além do limite — o lojista confere o
// preço do cardápio e marca "Ciente".
export default function CostAlerts({ alerts }) {
  const [pending, start] = useTransition()

  return (
    <div className="stk-cost-alerts">
      <p className="stk-cost-title">
        {alerts.length === 1 ? '1 insumo mudou de preço na última compra' : `${alerts.length} insumos mudaram de preço na última compra`}
        <span> — vale conferir se o preço dos lanches que usam esse insumo ainda compensa. Depois clique em Ciente.</span>
      </p>
      <ul>
        {alerts.map((a) => (
          <li key={a.id}>
            <span className="stk-name">{a.name}</span>
            {a.supplier && <span className="stk-sub">{a.supplier}</span>}
            <span className="stk-spacer" />
            <span className="tabnum">
              {fmtMoney(a.prev, { fine: true })} → {fmtMoney(a.next, { fine: true })}
            </span>
            <span className={`stk-var ${a.pct > 0 ? 'is-up' : 'is-down'}`}>
              {a.pct > 0 ? '+' : ''}{a.pct.toFixed(0)}%
            </span>
            <button
              type="button"
              className="stk-btn stk-btn--ghost"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await ackCostAlert(a.id)
                  if (!res.ok) toast.error(res.error)
                })
              }
            >
              <Check size={15} strokeWidth={2.2} aria-hidden /> Ciente
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
