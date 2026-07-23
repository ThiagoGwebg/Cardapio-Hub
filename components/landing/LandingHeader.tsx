import Link from 'next/link'
import { IconMenu } from '@/components/icons'
import LandingThemeToggle from './LandingThemeToggle'

export default function LandingHeader() {
  return (
    <header className="l-nav">
      <Link href="/" className="l-logo">
        cardápio<em>hub</em>
      </Link>

      <input type="checkbox" id="l-nav-toggle" className="l-nav-toggle-input" />

      <nav className="l-nav-links">
        <a href="#features">Funcionalidades</a>
        <a href="#pricing">Planos</a>
        <a href="#faq">Dúvidas</a>
        <div className="l-nav-cta">
          <Link href="/login" className="l-btn-ghost">Entrar</Link>
          <Link href="/contato" className="l-btn-primary">Fale com a gente</Link>
          
          <LandingThemeToggle className="l-theme-toggle l-theme-toggle-desktop" />
        </div>
      </nav>

      <div className="l-nav-mobile-actions">
        <LandingThemeToggle className="l-theme-toggle l-theme-toggle-mobile" />
        <label htmlFor="l-nav-toggle" className="l-nav-toggle-label" aria-label="Abrir menu">
          <IconMenu />
        </label>
      </div>
    </header>
  )
}
