import Link from 'next/link'

export default function LandingPricing() {
  return (
    <section className="l-section" id="pricing">
      <div className="l-section-head">
        <div className="l-eyebrow">Planos</div>
        <h2 className="l-h2">Comece leve, cresça quando precisar</h2>
        <p className="l-section-sub">Sem comissão por venda em nenhum plano.</p>
      </div>

      <div className="l-pricing-grid">
        <div className="l-plan-card">
          <div className="l-plan-name">Lite</div>
          <div className="l-plan-price">R$ 29<span> / mês</span></div>
          <p className="l-plan-desc">
            Para colocar sua loja no ar com o essencial e começar a vender já.
          </p>
          <ul className="l-plan-list">
            <li>Até 30 produtos no cardápio</li>
            <li>Até 60 pedidos por mês</li>
            <li>Cor e logo personalizáveis</li>
            <li>Painel de pedidos, caixa e desempenho</li>
            <li>Sem comissão por venda</li>
          </ul>
          <Link href="/contato" className="l-plan-cta outline">Quero o Lite</Link>
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
            <li>Cores, fontes e aviso promocional no cardápio</li>
            <li>Sua marca, sem selo Cardápio Hub</li>
            <li>Clientes fiéis (CRM) + relatórios avançados de 30/90 dias</li>
            <li>Notificações de pedido por WhatsApp</li>
            <li>Vários usuários e mais de uma loja na mesma conta</li>
            <li>QR Code para imprimir e exportação em CSV</li>
            <li>Suporte prioritário</li>
            <li>Cancele quando quiser, direto pelo painel</li>
          </ul>
          <Link href="/contato" className="l-plan-cta primary">Quero o Pro</Link>
        </div>
      </div>
      <p className="l-pricing-note">Fale com a gente e mostramos o valor exato do Pro pro seu segmento.</p>
    </section>
  )
}
