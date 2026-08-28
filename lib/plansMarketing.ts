/**
 * Planos como aparecem na VITRINE: card de planos da landing, JSON-LD de oferta
 * e llms.txt. Fonte única para os três — antes o preço estava escrito à mão em
 * cada lugar e saía de sincronia.
 *
 * NÃO confundir com o que o produto cobra e limita de verdade:
 *  - `PLAN_LIMITS` (lib/stripe/plans.ts) é o gate de produtos/pedidos;
 *  - a função `price_for_plan` NO BANCO é quem grava `subscriptions.price_cents`.
 * Hoje o produto só conhece dois planos ('free' | 'pro'). O Plus existe apenas
 * aqui, na vitrine, e é provisionado à mão pelo time — mudar isso exige migrar a
 * coluna `subscriptions.plan`, recriar `price_for_plan` e revisar os gates
 * `isStorePro()`. Enquanto isso não acontecer, todo preço abaixo é vitrine:
 * quem fatura é o banco.
 */

export type MarketingPlan = {
  key: 'lite' | 'plus' | 'pro'
  name: string
  priceBRL: number
  /** Frase curta sob o preço, no card. */
  tagline: string
  /** Destaca o card e ganha a fita "a maioria escolhe esse". */
  featured?: boolean
  features: string[]
  ctaLabel: string
  /** Versão de uma linha para o JSON-LD de oferta e o llms.txt. */
  schemaDescription: string
}

export const MARKETING_PLANS: MarketingPlan[] = [
  {
    key: 'lite',
    name: 'Lite',
    priceBRL: 29,
    tagline: 'Para colocar sua loja no ar com o essencial e começar a vender já.',
    features: [
      'Até 30 produtos no cardápio',
      'Até 60 pedidos por mês',
      'Cor e logo personalizáveis',
      'Painel de pedidos, caixa e desempenho',
      'Sem comissão por venda',
    ],
    ctaLabel: 'Quero o Lite',
    schemaDescription: 'Até 30 produtos e 60 pedidos por mês, sem comissão por venda.',
  },
  {
    key: 'plus',
    name: 'Plus',
    priceBRL: 69,
    tagline: 'Para quem já vende todo dia e não quer mais olhar pro limite de pedidos.',
    featured: true,
    features: [
      'Tudo do Lite',
      'Produtos ilimitados',
      'Até 300 pedidos por mês',
      'QR Code para imprimir',
      'Sem comissão por venda',
    ],
    ctaLabel: 'Quero o Plus',
    schemaDescription:
      'Produtos ilimitados e até 300 pedidos por mês, com QR Code para imprimir. Sem comissão por venda.',
  },
  {
    key: 'pro',
    name: 'Pro',
    priceBRL: 149,
    tagline: 'Para quem toca mais de uma operação e quer a marca só sua.',
    features: [
      'Tudo do Plus, sem nenhum limite',
      'Cores, fontes e aviso promocional no cardápio',
      'Sua marca, sem selo Cardápio Hub',
      'Clientes fiéis (CRM) + relatórios de 30/90 dias',
      'Notificações de pedido por WhatsApp',
      'Vários usuários e mais de uma loja na mesma conta',
      'Exportação em CSV',
      'Suporte prioritário',
      'Cancele quando quiser, direto pelo painel',
    ],
    ctaLabel: 'Quero o Pro',
    schemaDescription:
      'Produtos e pedidos ilimitados, marca própria sem selo, CRM, relatórios avançados e mais de uma loja na mesma conta.',
  },
]

/** Preço de entrada — o menor da grade. Usado em OG image, /contato e llms.txt. */
export const ENTRY_PRICE_BRL = MARKETING_PLANS[0].priceBRL
