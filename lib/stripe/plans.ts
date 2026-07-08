// Chave interna 'free' = plano Lite (nome de vitrine). Mantida como 'free'
// para não migrar a coluna subscriptions.plan nem os gates existentes.
export const PLAN_LIMITS = {
  free: { maxProducts: 30, maxOrdersPerMonth: 60 },
  pro: { maxProducts: Infinity, maxOrdersPerMonth: Infinity },
} as const

/** Preço mensal exibido do plano Lite (apenas vitrine; cobrança real é à parte). */
export const LITE_PRICE_LABEL = 'R$ 29'

export const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || ''
