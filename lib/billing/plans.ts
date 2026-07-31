import { fmtCents } from '@/lib/format'

// Mensalidade que o LOJISTA paga para a plataforma. Não confundir com o pagamento
// do cliente final (Mercado Pago OAuth, dinheiro que cai na conta do lojista).
//
// Estes são os valores PADRÃO: cada loja tem o próprio `subscriptions.price_cents`,
// definido no /admin, para permitir preço sob medida sem mexer no código.
export const DEFAULT_PLAN_PRICE_CENTS: Record<'free' | 'pro', number> = {
  free: 2900, // plano Lite
  pro: 8900,
}

/** Carência padrão (dias após o vencimento) antes de suspender o cardápio. */
export const DEFAULT_GRACE_DAYS = 5

/** Nome de vitrine do plano. A chave interna 'free' é o plano Lite. */
export function planLabel(plan: 'free' | 'pro'): string {
  return plan === 'pro' ? 'Pro' : 'Lite'
}

export function planPriceLabel(plan: 'free' | 'pro'): string {
  return fmtCents(DEFAULT_PLAN_PRICE_CENTS[plan])
}
