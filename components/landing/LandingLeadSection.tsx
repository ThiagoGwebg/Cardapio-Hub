import LandingLeadForm from './LandingLeadForm'

export default function LandingLeadSection() {
  return (
    <section className="l-lead-section" id="teste-agora">
      <div className="l-lead-section-inner">
        <div className="l-lead-copy">
          <div className="l-eyebrow">Teste agora</div>
          <h2 className="l-h2">Prefere que a gente te ajude a colocar a loja no ar?</h2>
          <p className="l-section-sub">
            Deixa seus dados que alguém do nosso time chama você no WhatsApp pra configurar o
            cardápio junto com você — sem custo.
          </p>
          <ul className="l-lead-list">
            <li>Resposta em até 1 dia útil</li>
            <li>Sem compromisso, sem cartão de crédito</li>
            <li>Ajuda a montar seu cardápio do zero, se precisar</li>
          </ul>
        </div>
        <LandingLeadForm />
      </div>
    </section>
  )
}
