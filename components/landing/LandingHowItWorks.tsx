import Image from 'next/image'

const STEPS = [
  {
    title: 'Crie sua loja em minutos',
    desc: 'Nome, endereço e WhatsApp — sem precisar de cartão de crédito para começar.',
  },
  {
    title: 'Monte seu cardápio',
    desc: 'Categorias, fotos e preços dos seus produtos, do jeito que fizer sentido pra loja.',
  },
  {
    title: 'Compartilhe e venda',
    desc: 'Seu link, seus clientes, seus pedidos caindo direto no painel.',
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
            src="/marketing/phone.png"
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
