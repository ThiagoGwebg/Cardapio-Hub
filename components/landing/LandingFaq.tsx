const FAQS = [
  {
    q: 'Preciso saber programar para usar?',
    a: 'Não. Você preenche os dados da sua loja e monta o cardápio direto pelo painel, sem escrever nenhuma linha de código.',
  },
  {
    q: 'Como funciona o plano Lite?',
    a: 'Por R$ 29/mês você tem até 30 produtos e 60 pedidos por mês, sem comissão por venda — o essencial pra colocar sua loja no ar e começar a vender.',
  },
  {
    q: 'Eu pago comissão por pedido?',
    a: 'Não. Diferente de marketplaces de delivery, aqui você não paga taxa nenhuma em cima das suas vendas.',
  },
  {
    q: 'Meus clientes fazem pedido direto pelo cardápio?',
    a: 'Sim. O pedido cai automaticamente no seu painel de gestão, em tempo real, assim que o cliente finaliza.',
  },
  {
    q: 'Tenho um link só pra minha loja?',
    a: 'Sim, você recebe um endereço exclusivo para compartilhar nas redes sociais, no WhatsApp e no Google.',
  },
  {
    q: 'Posso cancelar o plano Pro quando quiser?',
    a: 'Sim, a assinatura Pro pode ser gerenciada e cancelada a qualquer momento direto pelo painel, sem burocracia.',
  },
]

export default function LandingFaq() {
  return (
    <section className="l-section tight" id="faq">
      <div className="l-section-head">
        <div className="l-eyebrow">Dúvidas frequentes</div>
        <h2 className="l-h2">Perguntas que todo lojista faz</h2>
      </div>
      <div className="l-faq">
        {FAQS.map((f) => (
          <details className="l-faq-item" key={f.q}>
            <summary>{f.q}</summary>
            <p className="l-faq-answer">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
