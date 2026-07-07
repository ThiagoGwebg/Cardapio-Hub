import Link from 'next/link'
import { IconMenu } from '@/components/icons'

export default function LandingHeader() {
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
          <Link href="/login" className="l-btn-ghost">Entrar</Link>
          <Link href="/contato" className="l-btn-primary">Fale com a gente</Link>
        </div>
      </nav>

      <label htmlFor="l-nav-toggle" className="l-nav-toggle-label" aria-label="Abrir menu">
        <IconMenu />
      </label>
    </header>
  )
}
