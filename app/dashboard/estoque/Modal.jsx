'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

// Janela modal do estoque: <dialog> nativo (foco preso, Esc fecha, fundo
// inerte) em vez de reinventar isso à mão.
export default function Modal({ title, subtitle, onClose, children, footer, wide = false }) {
  const ref = useRef(null)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    return () => { if (d?.open) d.close() }
  }, [])

  return (
    <dialog
      ref={ref}
      className={`stk-modal ${wide ? 'is-wide' : ''}`}
      onCancel={(e) => { e.preventDefault(); onClose() }}
      onClick={(e) => { if (e.target === ref.current) onClose() }}
      aria-labelledby="stk-modal-title"
    >
      <div className="stk-modal-head">
        <div>
          <h2 id="stk-modal-title" className="stk-modal-title">{title}</h2>
          {subtitle && <p className="stk-modal-sub">{subtitle}</p>}
        </div>
        <button type="button" className="stk-icon-btn" onClick={onClose} aria-label="Fechar">
          <X size={18} strokeWidth={2.2} />
        </button>
      </div>
      <div className="stk-modal-body">{children}</div>
      {footer && <div className="stk-modal-foot">{footer}</div>}
    </dialog>
  )
}
