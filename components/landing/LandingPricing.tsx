import Link from 'next/link'
import { MARKETING_PLANS } from '@/lib/plansMarketing'

export default function LandingPricing() {
  return (
    <section className="l-section" id="pricing">
      <div className="l-section-head">
        <div className="l-eyebrow">Planos</div>
        <h2 className="l-h2">Comece leve, cresça quando precisar</h2>
        <p className="l-section-sub">Sem comissão por venda em nenhum plano.</p>
      </div>

      <div className="l-pricing-grid">
        {MARKETING_PLANS.map((plan) => (
          <div className={`l-plan-card ${plan.featured ? 'featured' : ''}`} key={plan.key}>
            {plan.featured && <span className="l-plan-badge">a maioria escolhe esse</span>}
            <div className="l-plan-head">
              <div className="l-plan-name">{plan.name}</div>
              <div className="l-plan-price">
                R$ {plan.priceBRL}<span> / mês</span>
              </div>
            </div>
            <p className="l-plan-desc">{plan.tagline}</p>
            <ul className="l-plan-list">
              {plan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <Link
              href="/contato"
              className={`l-plan-cta ${plan.featured ? 'primary' : 'outline'}`}
            >
              {plan.ctaLabel}
            </Link>
          </div>
        ))}
      </div>
      <p className="l-pricing-note">
        Sem cartão de crédito para começar — a gente configura a loja junto com você.
      </p>
    </section>
  )
}
