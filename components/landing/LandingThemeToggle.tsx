'use client'

import { IconSun, IconMoon } from '@/components/icons'
import { useLandingTheme } from './LandingThemeWrapper'

export default function LandingThemeToggle({ className = 'l-theme-toggle' }: { className?: string }) {
  const { themeMode, toggleThemeMode } = useLandingTheme()

  return (
    <button
      onClick={toggleThemeMode}
      className={className}
      aria-label="Alternar tema"
      title={themeMode === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
    >
      {themeMode === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />}
    </button>
  )
}
