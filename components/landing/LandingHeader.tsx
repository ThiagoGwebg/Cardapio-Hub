import Link from 'next/link'
import { IconMenu, IconSun, IconMoon } from '@/components/icons'

interface LandingHeaderProps {
  themeMode: 'light' | 'dark'
  toggleThemeMode: () => void
}

export default function LandingHeader({ themeMode, toggleThemeMode }: LandingHeaderProps) {
  return (
    <header className="l-nav">
      <Link href="/" className="l-logo">
        cardápio<em>ágil</em>
      </Link>

      <input type="checkbox" id="l-nav-toggle" className="l-nav-toggle-input" />

      <nav className="l-nav-links">
        <a href="#features">Funcionalidades</a>
        <a href="#pricing">Planos</a>
        <a href="#faq">Dúvidas</a>
        <div className="l-nav-cta">
          <Link href="/entregadores" className="l-btn-ghost">Quero entregar</Link>
          <Link href="/login" className="l-btn-ghost">Entrar</Link>
          <Link href="/contato" className="l-btn-primary">Fale com a gente</Link>
          
          <button
            onClick={toggleThemeMode}
            className="l-theme-toggle"
            aria-label="Alternar tema"
            title={themeMode === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
          >
            {themeMode === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />}
          </button>
        </div>
      </nav>

      <label htmlFor="l-nav-toggle" className="l-nav-toggle-label" aria-label="Abrir menu">
        <IconMenu />
      </label>
    </header>
  )
}
