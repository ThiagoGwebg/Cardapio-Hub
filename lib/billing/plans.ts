import { fmtCents } from '@/lib/format'

// Mensalidade que o LOJISTA paga para a plataforma. Não confundir com o pagamento
// do cliente final (Mercado Pago OAuth, dinheiro que cai na conta do lojista).
//
// ATENÇÃO: quem MANDA no valor cobrado é a função `price_for_plan` no banco — um
// trigger grava `subscriptions.price_cents` a cada mudança de plano, e o admin não
// digita valor. Estes números aqui são só para exibição (rótulos e a conferência do
// QR em /admin/faturas). Mudar o preço = recriar `price_for_plan` E atualizar aqui.
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
