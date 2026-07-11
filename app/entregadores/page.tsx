import type { Metadata } from 'next'
import '../landing.css'
import Link from 'next/link'
import LandingCourierForm from '@/components/landing/LandingCourierForm'

export const metadata: Metadata = {
  title: 'Seja Entregador Parceiro — CardápioÁgil',
  description: 'Cadastre-se para fazer entregas para os restaurantes parceiros do CardápioÁgil na sua região.',
}

export default function EntregadoresPage() {
  return (
    <div className="landing">
      <header className="l-nav">
        <Link href="/" className="l-logo">
          cardápio<em>ágil</em>
        </Link>
        <Link href="/" className="l-btn-ghost">← Voltar</Link>
      </header>

      <section className="l-contato">
        <div className="l-contato-inner">
          <div className="l-contato-head">
            <div className="l-eyebrow">Seja Parceiro</div>
            <h1 className="l-h2">Faça entregas com o CardápioÁgil</h1>
            <p className="l-section-sub">
              Cadastre-se para prestar serviços de entrega diretamente para os restaurantes parceiros na sua região. 
              Aqui, você negocia direto e fica com o controle do seu trabalho.
            </p>
            <ul className="l-lead-list">
              <li>
                <strong>Ganhos 100% seus:</strong> Fique com o valor total da taxa de entrega e das gorjetas.
              </li>
              <li>
                <strong>PIX Direto na hora:</strong> Receba o pagamento direto do cliente ou do estabelecimento no ato da entrega.
              </li>
              <li>
                <strong>Horários flexíveis:</strong> Selecione seus melhores períodos e combine direto com os comércios locais.
              </li>
              <li>
                <strong>Cadastro grátis:</strong> Nenhuma taxa de inscrição ou mensalidade para entregadores.
              </li>
            </ul>
          </div>

          <LandingCourierForm />
        </div>
      </section>
    </div>
  )
}
