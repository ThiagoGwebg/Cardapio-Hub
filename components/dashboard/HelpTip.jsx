'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { CircleHelp } from 'lucide-react'

const GAP = 8

/**
 * Ícone "?" que explica um termo. Abre com o mouse, com foco de teclado (Tab)
 * e com toque (celular não tem hover); Esc fecha.
 *
 *   <HelpTip title="Custo médio" example={<CostExample />}>Texto curto…</HelpTip>
 *
 * `title` (opcional) vira o título do balão e `example` (opcional) um bloco
 * "Exemplo" com um desenho do conceito — o balão fica mais largo nesse caso.
 *
 * O balão usa position: fixed calculado na hora — dentro de tabelas com
 * overflow (rolagem lateral) um balão absoluto seria cortado.
 */
export default function HelpTip({ children, title, example, label }) {
  const id = useId()
  const btnRef = useRef(null)
  const [pos, setPos] = useState(null)
  const width = example ? 340 : 280

  const show = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const w = Math.min(width, window.innerWidth - GAP * 2)
    const left = Math.min(Math.max(r.left + r.width / 2 - w / 2, GAP), window.innerWidth - w - GAP)
    // Em cima por padrão; embaixo se não houver espaço (balão com exemplo é mais alto).
    const above = r.top > (example ? 300 : 150)
    setPos({ left, top: above ? r.top - GAP : r.bottom + GAP, above, w })
  }, [width, example])
  const hide = useCallback(() => setPos(null), [])

  // Rolou a página: o balão fixo ficaria solto no lugar errado.
  useEffect(() => {
    if (!pos) return
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [pos, hide])

  return (
    <span className="help-tip">
      <button
        ref={btnRef}
        type="button"
        className="help-tip-btn"
        aria-label={label || (title ? `O que é ${title}?` : 'O que é isso?')}
        aria-describedby={pos ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          // Dentro de <summary>/<label>, o clique não pode abrir/marcar o pai.
          e.preventDefault()
          e.stopPropagation()
          if (pos) hide()
          else show()
        }}
        onKeyDown={(e) => { if (e.key === 'Escape') hide() }}
      >
        <CircleHelp size={14} strokeWidth={2} aria-hidden />
      </button>
      {pos && (
        <span
          id={id}
          role="tooltip"
          className={`help-tip-bubble ${pos.above ? 'is-above' : 'is-below'}`}
          style={{ left: pos.left, top: pos.top, width: pos.w }}
        >
          {title && <span className="help-tip-title">{title}</span>}
          <span className="help-tip-body">{children}</span>
          {example && (
            <span className="help-tip-example">
              <span className="help-tip-example-label">Exemplo</span>
              {example}
            </span>
          )}
        </span>
      )}
    </span>
  )
}
