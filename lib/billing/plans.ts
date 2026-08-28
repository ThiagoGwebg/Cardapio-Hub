import { fmtCents } from '@/lib/format'

// Mensalidade que o LOJISTA paga para a plataforma. Não confundir com o pagamento
// do cliente final (Mercado Pago OAuth, dinheiro que cai na conta do lojista).
//
// ATENÇÃO: quem MANDA no valor cobrado pelo Pix dinâmico é a função `price_for_plan`
// no banco — um trigger grava `subscriptions.price_cents` a cada mudança de plano, e
// o admin não digita valor. Estes números aqui são para EXIBIÇÃO e para conferir o QR
// estático em /admin/faturas. Mudar o preço = recriar `price_for_plan` E atualizar aqui.

/**
 * Plano como o BANCO conhece. A coluna `subscriptions.plan` só aceita estes dois —
 * 'free' é o nome interno do plano Lite. O Plus ainda não existe aqui: enquanto a
 * coluna não for migrada, uma loja no Plus é cadastrada como 'pro' e cobrada pelo
 * QR estático do Plus, com a fatura conferida à mão.
 */
export type SubscriptionPlan = 'free' | 'pro'

/**
 * Plano como a COBRANÇA conhece — inclui o Plus, que tem preço e QR próprios mesmo
 * sem ter representação na coluna `subscriptions.plan`.
 */
export type BillingPlan = 'free' | 'plus' | 'pro'

export const DEFAULT_PLAN_PRICE_CENTS: Record<BillingPlan, number> = {
  free: 2900, // plano Lite
  plus: 6900,
  pro: 14900,
}

/** Carência padrão (dias após o vencimento) antes de suspender o cardápio. */
export const DEFAULT_GRACE_DAYS = 5

/** Nome de vitrine do plano. A chave interna 'free' é o plano Lite. */
export function planLabel(plan: BillingPlan): string {
  if (plan === 'pro') return 'Pro'
  if (plan === 'plus') return 'Plus'
  return 'Lite'
}

export function planPriceLabel(plan: BillingPlan): string {
  return fmtCents(DEFAULT_PLAN_PRICE_CENTS[plan])
}
