const STEPS = [
  {
    title: 'Deixe seus dados',
    desc: 'Preencha o formulário rapidinho — nome, WhatsApp e o tipo da sua loja. Sem cartão de crédito.',
  },
  {
    title: 'A gente te chama',
    desc: 'Alguém do nosso time liga pra entender seu negócio e monta o cardápio junto com você.',
  },
  {
    title: 'Sua loja no ar',
    desc: 'Você recebe o link pronto, compartilha com seus clientes e os pedidos caem direto no painel.',
  },
]

export default function LandingHowItWorks() {
  return (
    <section className="l-section tight">
      <div className="l-section-head">
        <div className="l-eyebrow">Como funciona</div>
        <h2 className="l-h2">Do zero ao primeiro pedido, sem enrolação</h2>
      </div>
      {/* Classe própria (e não .l-steps, que a /para usa em lista vertical):
          aqui os três passos ficam lado a lado, ligados pela linha picotada. */}
      <div className="l-flow">
        {STEPS.map((s, i) => (
          <div className="l-flow-card" key={s.title}>
            <div className="l-flow-num">{String(i + 1).padStart(2, '0')}</div>
            <div className="l-flow-title">{s.title}</div>
            <div className="l-flow-desc">{s.desc}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
