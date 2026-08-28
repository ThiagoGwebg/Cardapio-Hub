import type { SupabaseClient } from '@supabase/supabase-js'
import type { BillingPlan } from '@/lib/billing/plans'
import { PLAN_LIMITS } from '@/lib/stripe/plans'

/**
 * Plano ATIVO da loja. Assinatura inativa cai para 'free' — é o mesmo critério
 * que `isStorePro` sempre usou, agora explícito e com três saídas.
 */
export async function getStorePlan(supabase: SupabaseClient, storeId: string): Promise<BillingPlan> {
  const { data } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('store_id', storeId)
    .maybeSingle()

  if (data?.status !== 'active') return 'free'
  if (data.plan === 'pro') return 'pro'
  if (data.plan === 'plus') return 'plus'
  return 'free'
}

/**
 * Retorna true se a loja tem assinatura Pro ativa.
 * Usado para liberar personalizações avançadas (cor, fonte etc.).
 * Logo e banner NÃO dependem disso — são liberados em todos os planos.
 *
 * Continua sendo Pro ESTRITO: o Plus não herda recurso de Pro. Quem precisa
 * saber "não é Lite" deve usar `getStorePlan()` e comparar, não isto.
 */
export async function isStorePro(supabase: SupabaseClient, storeId: string): Promise<boolean> {
  return (await getStorePlan(supabase, storeId)) === 'pro'
}

export type StoreUsage = {
  isPro: boolean
  plan: BillingPlan
  productCount: number
  ordersThisMonth: number
  maxProducts: number
  maxOrdersPerMonth: number
}

/**
 * Uso atual da loja frente aos limites do plano (produtos cadastrados
 * e pedidos no mês corrente). Base dos medidores de uso e dos gates do Free.
 */
export async function getStoreUsage(supabase: SupabaseClient, storeId: string): Promise<StoreUsage> {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [plan, productsRes, ordersRes] = await Promise.all([
    getStorePlan(supabase, storeId),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .neq('status', 'cancelado')
      // Só conta vendas reais: pedidos aguardando/sem pagamento confirmado não entram no limite.
      .in('payment_status', ['not_required', 'paid'])
      .gte('created_at', monthStart.toISOString()),
  ])

  const limits = PLAN_LIMITS[plan]
  return {
    isPro: plan === 'pro',
    plan,
    productCount: productsRes.count ?? 0,
    ordersThisMonth: ordersRes.count ?? 0,
    maxProducts: limits.maxProducts,
    maxOrdersPerMonth: limits.maxOrdersPerMonth,
  }
}

/** Fontes disponíveis para o cardápio (personalização Pro). */
export const STORE_FONTS = [
  { value: 'Nunito', label: 'Nunito (padrão)' },
  { value: 'Sora', label: 'Sora' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Playfair Display', label: 'Playfair Display' },
] as const

export const DEFAULT_STORE_FONT = 'Nunito'

/** Monta a URL do Google Fonts para carregar a família escolhida. */
export function googleFontHref(font: string): string {
  const family = encodeURIComponent(font).replace(/%20/g, '+')
  return `https://fonts.googleapis.com/css2?family=${family}:wght@400;600;700;800;900&display=swap`
}
