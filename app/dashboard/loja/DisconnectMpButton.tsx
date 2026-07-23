'use client'

import { useFormStatus } from 'react-dom'

/** Botão de submit que reage ao estado pendente da Server Action do form pai. */
function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      className="ordertype-btn"
      disabled={pending}
      style={{ flex: 'none', color: 'var(--red)', borderColor: 'var(--red)' }}
    >
      {pending ? (
        <>
          <span className="btn-spinner" aria-hidden />
          Desvinculando…
        </>
      ) : (
        'Desvincular'
      )}
    </button>
  )
}

export default function DisconnectMpButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          !window.confirm(
            'Desvincular a conta do Mercado Pago?\n\n' +
              '• O Pix pelo app será desligado e o cardápio volta a aceitar só as formas offline.\n' +
              '• Pedidos que já estavam aguardando pagamento não serão mais confirmados automaticamente.\n\n' +
              'Você pode conectar de novo quando quiser.'
          )
        ) {
          e.preventDefault()
        }
      }}
    >
      <SubmitButton />
    </form>
  )
}
