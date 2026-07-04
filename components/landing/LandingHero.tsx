import Link from 'next/link'
import { IconUtensils, IconCheck } from '@/components/icons'

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
            <Link href="/signup" className="l-btn-primary large">Criar minha loja grátis</Link>
            <a href="#story" className="l-hero-link">ou veja quem já usa ↓</a>
          </div>
          <p className="l-hero-trust">sem cartão de crédito · loja no ar em minutos</p>
        </div>

        <div className="l-mockup-wrap">
          <div className="l-mockup" aria-hidden="true">
            <div className="l-mockup-bar">
              <div className="l-mockup-logo">
                <IconUtensils size={16} />
              </div>
              <div>
                <div className="l-mockup-name">Bom Sabor Mini Salgados</div>
                <div className="l-mockup-status">● Aberto agora</div>
              </div>
            </div>
            <div className="l-mockup-body">
              <div className="l-mockup-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="l-mockup-thumb-img"
                  src="/img/fotos_produtos/Cento_de_Mini_Salgados_-_100_Unidades.png"
                  alt="Cento de Mini Salgados"
                />
                <div className="l-mockup-info">
                  <div className="l-mockup-title">Cento de Mini Salgados</div>
                  <div className="l-mockup-desc">100 unidades à sua escolha</div>
                  <div className="l-mockup-footer">
                    <span className="l-mockup-price">R$ 44,99</span>
                    <span className="l-mockup-add">+</span>
                  </div>
                </div>
              </div>
              <div className="l-mockup-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="l-mockup-thumb-img"
                  src="/img/fotos_produtos/Pastel_Salgado.png"
                  alt="Pastel Salgado"
                />
                <div className="l-mockup-info">
                  <div className="l-mockup-title">Pastel Salgado</div>
                  <div className="l-mockup-desc">Frito na hora, crocante</div>
                  <div className="l-mockup-footer">
                    <span className="l-mockup-price">R$ 10,00</span>
                    <span className="l-mockup-add">+</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="l-mockup-toast">
              <IconCheck size={12} /> Pedido recebido no seu painel agora
            </div>
          </div>
          <span className="l-mockup-caption">— o painel de pedidos, ao vivo —</span>
        </div>
      </div>
    </section>
  )
}
