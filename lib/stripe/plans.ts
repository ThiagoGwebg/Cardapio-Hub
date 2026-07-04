export const PLAN_LIMITS = {
  free: { maxProducts: 20, maxOrdersPerMonth: 30 },
  pro: { maxProducts: Infinity, maxOrdersPerMonth: Infinity },
} as const

export const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || ''
