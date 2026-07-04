import Link from 'next/link'

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
              <div className="l-mockup-logo">🍔</div>
              <div>
                <div className="l-mockup-name">Burger do Zé</div>
                <div className="l-mockup-status">● Aberto agora</div>
              </div>
            </div>
            <div className="l-mockup-body">
              <div className="l-mockup-card">
                <div className="l-mockup-thumb">🍟</div>
                <div className="l-mockup-info">
                  <div className="l-mockup-title">Batata frita grande</div>
                  <div className="l-mockup-desc">Crocante, porção generosa</div>
                  <div className="l-mockup-footer">
                    <span className="l-mockup-price">R$ 18,90</span>
                    <span className="l-mockup-add">+</span>
                  </div>
                </div>
              </div>
              <div className="l-mockup-card">
                <div className="l-mockup-thumb">🍔</div>
                <div className="l-mockup-info">
                  <div className="l-mockup-title">Cheeseburger duplo</div>
                  <div className="l-mockup-desc">Blend da casa, queijo cheddar</div>
                  <div className="l-mockup-footer">
                    <span className="l-mockup-price">R$ 27,50</span>
                    <span className="l-mockup-add">+</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="l-mockup-toast">✓ Pedido recebido no seu painel agora</div>
          </div>
          <span className="l-mockup-caption">— o painel de pedidos, ao vivo —</span>
        </div>
      </div>
    </section>
  )
}
