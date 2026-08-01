import type { Metadata } from 'next'
import '../landing.css'
import Link from 'next/link'
import LandingLeadForm from '@/components/landing/LandingLeadForm'
import { absoluteUrl } from '@/lib/seo'

const DESCRIPTION =
  'Fale com a gente e coloque seu cardápio digital no ar hoje: a partir de R$ 29/mês, sem comissão por venda e sem cartão de crédito para começar.'

export const metadata: Metadata = {
  // Sem sufixo manual: o template do layout raiz já acrescenta "— Cardápio Hub".
  title: 'Fale com a gente',
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl('/contato') },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/contato'),
    title: 'Fale com a gente — Cardápio Hub',
    description: DESCRIPTION,
  },
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
