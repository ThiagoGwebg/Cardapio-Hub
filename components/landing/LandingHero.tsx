import Link from 'next/link'
import Image from 'next/image'

export default function LandingHero() {
  return (
    <section className="l-hero">
      <div className="l-hero-grid">
        <div>
          <span className="l-tag">sem taxa por pedido</span>
          <h1 className="l-h1">
            Do balcão pro <em>celular</em> do seu cliente.
          </h1>
          <p className="l-hero-sub">
            Cardápio, pedidos e caixa da sua lanchonete ou barraca num painel só — sem
            precisar anotar nada no bloquinho.
          </p>
          <div className="l-hero-ctas">
            <Link href="/contato" className="l-btn-primary large">Quero minha loja no ar</Link>
            <a href="#story" className="l-hero-link">ou veja quem já usa ↓</a>
          </div>
          <p className="l-hero-trust">sem cartão de crédito · a gente configura junto com você</p>
        </div>

        <div className="l-mockup-wrap">
          <Image
            src="/marketing/phone-cutout.png"
            alt="CardápioÁgil aberto no celular"
            width={896}
            height={1200}
            className="l-mockup-photo"
            priority
          />
        </div>
      </div>
    </section>
  )
}
