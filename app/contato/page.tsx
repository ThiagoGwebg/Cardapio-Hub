import type { Metadata } from 'next'
import '../landing.css'
import Link from 'next/link'
import LandingLeadForm from '@/components/landing/LandingLeadForm'

export const metadata: Metadata = {
  title: 'Fale com a gente — Cardápio Hub',
  description: 'Deixe seus dados e o nosso time coloca seu cardápio digital no ar com você.',
}

export default function ContatoPage() {
  return (
    <div className="landing">
      <header className="l-nav">
        <Link href="/" className="l-logo">
          cardápio<em>hub</em>
        </Link>
        <Link href="/" className="l-btn-ghost">← Voltar</Link>
      </header>

      <section className="l-contato">
        <div className="l-contato-inner">
          <div className="l-contato-head">
            <div className="l-eyebrow">Comece agora</div>
            <h1 className="l-h2">Deixa que a gente coloca sua loja no ar</h1>
            <p className="l-section-sub">
              Preencha os dados abaixo e alguém do nosso time chama você no WhatsApp pra montar o
              cardápio junto com você — sem custo e sem compromisso.
            </p>
            <ul className="l-lead-list">
              <li>Resposta em até 1 dia útil</li>
              <li>Sem cartão de crédito</li>
              <li>Ajuda a montar seu cardápio do zero, se precisar</li>
            </ul>
          </div>

          <LandingLeadForm />
        </div>
      </section>
    </div>
  )
}
