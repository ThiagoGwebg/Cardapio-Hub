'use client'

import { useFormStatus } from 'react-dom'
import type { CSSProperties, ReactNode } from 'react'

type Props = {
  children: ReactNode
  /** Texto/spinner exibido enquanto a Server Action do form roda. */
  pendingLabel?: string
  className?: string
  style?: CSSProperties
}

/**
 * Botão de submit que reage automaticamente ao estado pendente do <form>
 * pai (Server Action) via useFormStatus. Enquanto envia, mostra spinner +
 * texto de "salvando" e fica desabilitado — evita clique duplo e a sensação
 * de que "não funcionou". Precisa estar DENTRO de um <form>.
 */
export default function SubmitButton({
  children,
  pendingLabel = 'Salvando…',
  className = 'save-btn',
  style,
}: Props) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={className} style={style} disabled={pending}>
      {pending ? (
        <>
          <span className="btn-spinner" aria-hidden />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  )
}
