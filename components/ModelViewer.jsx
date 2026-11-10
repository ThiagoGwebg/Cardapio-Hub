'use client'

import { useEffect, useState } from 'react'

/**
 * Wrapper do <model-viewer> (Google). O custom element só é registrado no
 * navegador — o import dinâmico aqui evita que o bundle do visualizador 3D
 * entre em páginas que não o usam e que ele tente rodar no servidor.
 *
 * Props extras (ex.: ar, ar-modes, camera-controls) passam direto pro
 * elemento; o React 19 escreve atributos de custom elements nativamente.
 */
export default function ModelViewer({ children, style, ...props }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    import('@google/model-viewer').then(() => {
      if (alive) setReady(true)
    })
    return () => {
      alive = false
    }
  }, [])

  if (!ready) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', fontSize: 13, color: 'var(--muted)', ...style }}>
        Carregando 3D…
      </div>
    )
  }

  return (
    <model-viewer style={style} {...props}>
      {children}
    </model-viewer>
  )
}
