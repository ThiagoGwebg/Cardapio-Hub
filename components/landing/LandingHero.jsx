import Link from 'next/link'
import Image from 'next/image'

export default function LandingHero() {
  return (
    <section className="l-hero">
      {/* Brilhos e a trama de pontos ficam em elementos próprios: assim o gradiente
          da faixa continua sendo um background só, sem empilhar 4 camadas na mesma
          propriedade (que é o que costuma estourar o custo de pintura no mobile). */}
      <div className="l-hero-glow" aria-hidden="true" />
      <div className="l-hero-grid">
        <div>
          {/* Sobretítulo de propósito NÃO fala de preço: a cobrança por pedido
              deve mudar, e a promessa de "sem taxa" tende a virar atributo de
              plano (ver LandingPricing) em vez de promessa da marca inteira. */}
          <span className="l-tag">seu link, seus clientes</span>
          <h1 className="l-h1">
            Do balcão pro <em>celular</em> do seu cliente.
          </h1>
          <p className="l-hero-sub">
            Cardápio digital com QR Code, pedidos e caixa da sua lanchonete ou barraca num
            painel só — sem precisar anotar nada no bloquinho.
          </p>
          <div className="l-hero-ctas">
            <Link href="/contato" className="l-btn-primary large">Quero minha loja no ar</Link>
            <a href="#pricing" className="l-btn-ghost large">Ver os planos</a>
          </div>
          <p className="l-hero-trust">sem cartão de crédito · a gente configura junto com você</p>
        </div>

        <div className="l-mockup-wrap">
          <Image
            src="/marketing/phone-cutout.png"
            alt="Cardápio Hub aberto no celular"
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
