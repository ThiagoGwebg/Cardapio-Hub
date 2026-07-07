'use client'

export default function PrintButton() {
  return (
    <button className="save-btn no-print" style={{ marginBottom: 0 }} onClick={() => window.print()}>
      🖨 Imprimir comanda
    </button>
  )
}
