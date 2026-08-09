'use client'

import { useState, useTransition } from 'react'
import { ArrowUpCircle, MessageSquare } from 'lucide-react'
import { fmtPhone, waLink } from '@/lib/phone'
import { dismissUpgradeRequest } from './actions'

type Props = {
  storeId: string
  storeName: string
  request: { createdAt: string; phone: string | null; note: string | null }
}

/**
 * Faixa do pedido de upgrade feito pelo lojista no painel. O pedido some sozinho
 * quando o Pro é ativado (setStorePlan); "Dispensar" é para quando ele desiste.
 */
export default function UpgradeRequest({ storeId, storeName, request }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const wa = waLink(
    request.phone,
    `Oi! Aqui é do Cardápio Hub — vi que você pediu o upgrade pro Pro na loja ${storeName}. Posso te ajudar a ativar?`
  )

  function dismiss() {
    if (!window.confirm('Dispensar esse pedido de upgrade sem ativar o Pro?')) return
    setError(null)
    startTransition(async () => {
      const res = await dismissUpgradeRequest(storeId)
      if (!res.ok) setError(res.error || 'Erro ao dispensar.')
    })
  }

  return (
    <div className="adm-upgrade-req">
      <div className="adm-upgrade-head">
        <ArrowUpCircle size={14} strokeWidth={2.4} />
        <strong>Pediu o Pro</strong>
        <span>
          em{' '}
          {new Date(request.createdAt).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
          })}
        </span>
        {request.phone &&
          (wa ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="adm-upgrade-wa">
              <MessageSquare size={12} strokeWidth={2.4} /> {fmtPhone(request.phone)}
            </a>
          ) : (
            <span>{fmtPhone(request.phone)}</span>
          ))}
        <button className="adm-upgrade-dismiss" onClick={dismiss} disabled={pending}>
          {pending ? '…' : 'Dispensar'}
        </button>
      </div>
      {request.note && <p className="adm-upgrade-note">“{request.note}”</p>}
      {error && <span className="adm-toggle-error">{error}</span>}
    </div>
  )
}
