// Exportado porque a home usa a mesma lista para gerar o schema FAQPage —
// o texto visível e o JSON-LD precisam bater, senão o Google trata como spam.
export const FAQS = [
  {
    q: 'Preciso saber programar para usar?',
    a: 'Não. Você preenche os dados da sua loja e monta o cardápio direto pelo painel, sem escrever nenhuma linha de código.',
  },
  {
    q: 'Qual plano eu escolho?',
    a: 'Comece pelo Lite, de R$ 29/mês, se ainda está começando: são até 30 produtos e 60 pedidos por mês. Se já vende todo dia, o Plus de R$ 69/mês libera produtos ilimitados e até 300 pedidos por mês. O Pro, de R$ 149/mês, é pra quem toca mais de uma loja ou quer o cardápio sem nenhum selo nosso.',
  },
  {
    q: 'Posso trocar de plano depois?',
    a: 'Pode, a qualquer momento. Você começa no Lite e sobe pro Plus ou pro Pro quando o volume de pedidos pedir — sem perder o cardápio, os produtos nem o histórico de vendas.',
  },
  {
    q: 'Eu pago comissão por pedido?',
    a: 'Não. Diferente de marketplaces de delivery, aqui você não paga taxa nenhuma em cima das suas vendas, em nenhum dos três planos.',
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
    q: 'Posso cancelar quando quiser?',
    a: 'Sim, a assinatura pode ser gerenciada e cancelada a qualquer momento direto pelo painel, sem burocracia.',
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
