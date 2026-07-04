import Link from 'next/link'

export default function LandingPricing() {
  return (
    <section className="l-section" id="pricing">
      <div className="l-section-head">
        <div className="l-eyebrow">Planos</div>
        <h2 className="l-h2">Comece grátis, cresça quando precisar</h2>
        <p className="l-section-sub">Sem comissão por venda em nenhum plano.</p>
      </div>

      <div className="l-pricing-grid">
        <div className="l-plan-card">
          <div className="l-plan-name">Free</div>
          <div className="l-plan-price">R$ 0</div>
          <p className="l-plan-desc">
            Ideal para testar a plataforma e colocar sua loja no ar sem custo.
          </p>
          <ul className="l-plan-list">
            <li>Até 20 produtos no cardápio</li>
            <li>Até 30 pedidos por mês</li>
            <li>Cor e logo personalizáveis</li>
            <li>Painel de pedidos, caixa e desempenho</li>
          </ul>
          <Link href="/signup" className="l-plan-cta outline">Começar grátis</Link>
        </div>

        <div className="l-plan-card featured">
          <span className="l-plan-badge">a maioria escolhe esse</span>
          <div className="l-plan-name">Pro</div>
          <div className="l-plan-price">Sob medida<span> / mês</span></div>
          <p className="l-plan-desc">
            Para quem já vende e quer crescer sem limite de produtos ou pedidos.
          </p>
          <ul className="l-plan-list">
            <li>Produtos e pedidos ilimitados</li>
            <li>Banner e fontes personalizadas no cardápio</li>
            <li>Tudo do plano Free incluso</li>
            <li>Cancele quando quiser, direto pelo painel</li>
          </ul>
          <Link href="/signup" className="l-plan-cta primary">Assinar Pro</Link>
        </div>
      </div>
      <p className="l-pricing-note">Crie sua conta grátis e veja o valor exato do Pro dentro do painel.</p>
    </section>
  )
}
