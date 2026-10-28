'use client'

import { useState } from 'react'
import { Printer } from 'lucide-react'
import { loadPrintSettings, printReceiptNow } from '@/lib/print/autoPrint'

export default function PrintButton({ orderId }) {
  const [busy, setBusy] = useState(false)

  // Imprime a mesma comanda térmica da impressão automática (58/80mm), e não a
  // página do painel — assim o que sai na mão é idêntico ao que sai sozinho.
  async function print() {
    if (busy) return
    setBusy(true)
    try {
      await printReceiptNow(orderId, loadPrintSettings())
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      className="save-btn no-print"
      style={{ marginBottom: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}
      onClick={print}
      disabled={busy}
    >
      {busy ? <span className="btn-spinner" aria-hidden /> : <Printer size={16} strokeWidth={2.2} />}
      Imprimir comanda
    </button>
  )
}
