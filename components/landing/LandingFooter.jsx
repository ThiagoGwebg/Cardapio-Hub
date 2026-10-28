import Link from 'next/link'
import { SEGMENTS } from '@/lib/segments'

export default function LandingFooter() {
  return (
    <footer className="l-footer">
      <div className="l-footer-inner">
        <div className="l-footer-brand">
          <Link href="/" className="l-logo">
            cardápio<em>hub</em>
          </Link>
          <p className="l-footer-pitch">
            Cardápio digital, pedidos e caixa num painel só — sem comissão em cima das suas
            vendas.
          </p>
        </div>

        <div className="l-footer-col">
          <span className="l-footer-col-title">Produto</span>
          <a href="#features">Funcionalidades</a>
          <a href="#pricing">Planos</a>
          <a href="#faq">Dúvidas</a>
        </div>

        <div className="l-footer-col">
          <span className="l-footer-col-title">Empresa</span>
          <Link href="/contato">Fale com a gente</Link>
          <Link href="/entregadores">Seja entregador</Link>
          <Link href="/privacidade">Privacidade</Link>
        </div>

        <div className="l-footer-col">
          <span className="l-footer-col-title">Sua conta</span>
          <Link href="/login">Entrar</Link>
          <Link href="/contato">Criar minha loja</Link>
        </div>
      </div>

      {/* Links pras landings de segmento em todas as páginas: é assim que o Google
          descobre e revisita o conjunto, e é o que passa autoridade da home pra elas. */}
      <nav className="l-segment-links">
        {SEGMENTS.map((s) => (
          <Link key={s.slug} href={`/para/${s.slug}`}>
            Cardápio digital para {s.label}
          </Link>
        ))}
      </nav>

      <div className="l-footer-bottom">
        <span className="l-footer-copy">© 2026 Cardápio Hub. Todos os direitos reservados.</span>
      </div>
    </footer>
  )
}
