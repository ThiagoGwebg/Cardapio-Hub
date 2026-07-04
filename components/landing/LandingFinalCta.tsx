import Link from 'next/link'

export default function LandingFinalCta() {
  return (
    <section className="l-final-cta">
      <div className="l-final-cta-inner">
        <div>
          <h2 className="l-h2">Pronto pra vender mais com menos trabalho?</h2>
          <p className="l-final-cta-sub">
            Crie sua loja agora e coloque seu cardápio digital no ar em minutos.
          </p>
        </div>
        <Link href="/signup" className="l-btn-primary large">Criar minha loja grátis</Link>
      </div>
    </section>
  )
}
