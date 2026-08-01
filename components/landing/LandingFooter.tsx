import Link from 'next/link'
import { SEGMENTS } from '@/lib/segments'

export default function LandingFooter() {
  return (
    <footer className="l-footer">
      <div className="l-footer-inner">
        <Link href="/" className="l-logo">
          cardápio<em>hub</em>
        </Link>
        <nav className="l-footer-links">
          <a href="#features">Funcionalidades</a>
          <a href="#pricing">Planos</a>
          <a href="#faq">Dúvidas</a>
          <Link href="/entregadores">Seja entregador</Link>
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/login">Entrar</Link>
          <Link href="/contato">Fale com a gente</Link>
        </nav>
        {/* Links pras landings de segmento em todas as páginas: é assim que o Google
            descobre e revisita o conjunto, e é o que passa autoridade da home pra elas. */}
        <nav className="l-segment-links">
          {SEGMENTS.map((s) => (
            <Link key={s.slug} href={`/para/${s.slug}`}>
              Cardápio digital para {s.label}
            </Link>
          ))}
        </nav>
        <span className="l-footer-copy">© 2026 Cardápio Hub. Todos os direitos reservados.</span>
      </div>
    </footer>
  )
}
