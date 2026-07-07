import Link from 'next/link'

export default function LandingFinalCta() {
  return (
    <section className="l-final-cta">
      <div className="l-final-cta-inner">
        <div>
          <h2 className="l-h2">Pronto pra vender mais com menos trabalho?</h2>
          <p className="l-final-cta-sub">
            Deixe seus dados que a gente coloca seu cardápio digital no ar com você.
          </p>
        </div>
        <Link href="/contato" className="l-btn-primary large">Falar com o time</Link>
      </div>
    </section>
  )
}
