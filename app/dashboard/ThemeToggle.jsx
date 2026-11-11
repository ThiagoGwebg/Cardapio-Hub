'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'


const THEMES = [
  { value: 'light', label: 'Claro', Icon: Sun },
  { value: 'dark', label: 'Escuro', Icon: Moon },
]

const STORAGE_KEY = 'cardapio-dash-theme'

/*
 * Trocar o tema depois da página pintada deixa o Chromium com camadas já
 * rasterizadas nas cores antigas (aparecia uma faixa "clara" no rodapé do
 * painel escuro). Este empurrão força a recomposição da página inteira.
 */
function forceRepaint() {
  requestAnimationFrame(() => {
    document.body.style.transform = 'translateZ(0)'
    requestAnimationFrame(() => {
      document.body.style.transform = ''
    })
  })
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    // O script inline do shell só roda em carga completa — numa navegação
    // client-side (ex.: logo após o login) o React não executa <script>
    // injetado, e o tema salvo ficava ignorado até um F5. Aqui é a fonte de
    // verdade: localStorage primeiro, atributo atual como reserva.
    let saved = null
    try { saved = localStorage.getItem(STORAGE_KEY) } catch { /* sem storage */ }
    let current = saved || document.documentElement.getAttribute('data-dash-theme') || 'light'
    // O tema "black" foi aposentado — quem o tinha salvo cai no escuro.
    if (current === 'black') current = 'dark'
    setTheme(current)
    if (document.documentElement.getAttribute('data-dash-theme') !== current) {
      document.documentElement.setAttribute('data-dash-theme', current)
      forceRepaint()
    }
  }, [])

  function applyTheme(value) {
    setTheme(value)
    document.documentElement.setAttribute('data-dash-theme', value)
    try { localStorage.setItem(STORAGE_KEY, value) } catch { /* sem storage */ }
    forceRepaint()
  }

  return (
    <div className="theme-toggle" role="group" aria-label="Tema do painel">
      {THEMES.map((t) => (
        <button
          key={t.value}
          type="button"
          className={`theme-toggle-btn ${theme === t.value ? 'active' : ''}`}
          onClick={() => applyTheme(t.value)}
          aria-label={t.label}
          title={t.label}
        >
          <t.Icon size={15} strokeWidth={2.2} />
        </button>
      ))}
    </div>
  )
}
