// Chave interna 'free' = plano Lite (nome de vitrine). Mantida como 'free'
// para não migrar os gates existentes.
//
// O Plus é o degrau do meio: solta o cadastro de produtos mas mantém teto de
// pedidos. É esse teto que o diferencia do Pro — sem ele o plano não teria por
// que existir.
export const PLAN_LIMITS = {
  free: { maxProducts: 30, maxOrdersPerMonth: 60 },
  plus: { maxProducts: Infinity, maxOrdersPerMonth: 300 },
  pro: { maxProducts: Infinity, maxOrdersPerMonth: Infinity },
} as const

// Preço não mora aqui: vitrine em `lib/plansMarketing.ts`, cobrança em
// `DEFAULT_PLAN_PRICE_CENTS` (lib/billing/plans.ts). Havia um LITE_PRICE_LABEL
// solto neste arquivo, sem nenhum uso — só mais um número pra envelhecer sozinho.

export const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || ''
