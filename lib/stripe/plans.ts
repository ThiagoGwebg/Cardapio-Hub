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

/** Preço mensal exibido do plano Lite (apenas vitrine; cobrança real é à parte). */
export const LITE_PRICE_LABEL = 'R$ 29'

export const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || ''
