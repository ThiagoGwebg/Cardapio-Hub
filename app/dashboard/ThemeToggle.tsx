'use client'

import { useEffect, useState } from 'react'

type DashTheme = 'light' | 'dark' | 'black'

const THEMES: { value: DashTheme; label: string; icon: string }[] = [
  { value: 'light', label: 'Claro', icon: '☀️' },
  { value: 'dark', label: 'Escuro', icon: '🌙' },
  { value: 'black', label: 'Black', icon: '⚫' },
]

const STORAGE_KEY = 'cardapio-dash-theme'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<DashTheme>('light')

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-dash-theme') as DashTheme | null
    if (current) setTheme(current)
  }, [])

  function applyTheme(value: DashTheme) {
    setTheme(value)
    document.documentElement.setAttribute('data-dash-theme', value)
    localStorage.setItem(STORAGE_KEY, value)
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
          {t.icon}
        </button>
      ))}
    </div>
  )
}
