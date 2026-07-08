import Link from 'next/link'

export default function LandingFooter() {
  return (
    <footer className="l-footer">
      <div className="l-footer-inner">
        <Link href="/" className="l-logo">
          cardápio<em>ágil</em>
        </Link>
        <nav className="l-footer-links">
          <a href="#features">Funcionalidades</a>
          <a href="#pricing">Planos</a>
          <a href="#faq">Dúvidas</a>
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/entregadores">Quero Entregar</Link>
          <Link href="/login">Entrar</Link>
          <Link href="/contato">Fale com a gente</Link>
        </nav>
        <span className="l-footer-copy">© 2026 CardápioÁgil. Todos os direitos reservados.</span>
      </div>
    </footer>
  )
}
