import Image from 'next/image'

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
      <div className="l-steps-layout">
        <div className="l-steps">
          {STEPS.map((s, i) => (
            <div className="l-step" key={s.title}>
              <div className="l-step-num">{String(i + 1).padStart(2, '0')}</div>
              <div>
                <div className="l-step-title">{s.title}</div>
                <div className="l-step-desc">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="l-steps-photo-wrap">
          <Image
            src="/marketing/phone-cutout.png"
            alt="Cardápio da loja aberto no celular"
            width={896}
            height={1200}
            className="l-steps-photo"
          />
        </div>
      </div>
    </section>
  )
}
