'use client'

import { Printer } from 'lucide-react'

export default function PrintButton() {
  return (
    <button
      className="save-btn no-print"
      style={{ marginBottom: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}
      onClick={() => window.print()}
    >
      <Printer size={16} strokeWidth={2.2} />
      Imprimir comanda
    </button>
  )
}
