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
          Excluindo…
        </>
      ) : (
        'Excluir produto'
      )}
    </button>
  )
}

export default function DeleteProductButton({
  action,
  productName,
}: {
  action: () => Promise<void>
  productName: string
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Excluir "${productName}"? Essa ação não tem volta.`)) {
          e.preventDefault()
        }
      }}
    >
      <SubmitButton />
    </form>
  )
}
