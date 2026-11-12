'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'


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

  // Com só dois temas, um interruptor é mais claro que dois botões — e cabe no
  // trilho recolhido da sidebar como mais um ícone.
  const isDark = theme === 'dark'
  const Icon = isDark ? Moon : Sun
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      className="nav-item nav-item--button theme-switch"
      onClick={() => applyTheme(isDark ? 'light' : 'dark')}
    >
      <span className="nav-ico"><Icon size={19} strokeWidth={2} /></span>
      <span className="nav-label">Tema escuro</span>
      <span className={`theme-switch-track ${isDark ? 'on' : ''}`} aria-hidden>
        <span className="theme-switch-thumb" />
      </span>
    </button>
  )
}
