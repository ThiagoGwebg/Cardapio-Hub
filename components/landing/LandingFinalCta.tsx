import Link from 'next/link'
import LandingLeadForm from '@/components/landing/LandingLeadForm'

/* `withForm` só na home: nas landings de segmento a faixa continua sendo só o
   convite, pra não repetir o mesmo formulário em 10 páginas indexadas. */
export default function LandingFinalCta({ withForm = false }: { withForm?: boolean }) {
  return (
    <section className={`l-final-cta ${withForm ? 'with-form' : ''}`} id="comecar">
      <div className="l-final-cta-inner">
        <div className="l-final-cta-copy">
          <h2 className="l-h2">Pronto pra vender mais com menos trabalho?</h2>
          <p className="l-final-cta-sub">
            Deixe seus dados que a gente coloca seu cardápio digital no ar com você.
          </p>
          <ul className="l-final-cta-list">
            <li>Sem cartão de crédito</li>
            <li>Sem comissão por pedido</li>
            <li>A configuração a gente faz junto</li>
          </ul>
          {!withForm && <Link href="/contato" className="l-btn-primary large">Falar com o time</Link>}
        </div>
        {withForm && (
          <div className="l-final-cta-form">
            <LandingLeadForm />
          </div>
        )}
      </div>
    </section>
  )
}
