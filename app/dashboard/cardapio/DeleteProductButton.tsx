'use client'

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
      <button
        type="submit"
        className="ordertype-btn"
        style={{ flex: 'none', color: 'var(--red)', borderColor: 'var(--red)' }}
      >
        Excluir produto
      </button>
    </form>
  )
}
