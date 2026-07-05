import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Retorna true se a loja tem assinatura Pro ativa.
 * Usado para liberar personalizações avançadas (cor, fonte etc.).
 * Logo e banner NÃO dependem disso — são liberados em todos os planos.
 */
export async function isStorePro(supabase: SupabaseClient, storeId: string): Promise<boolean> {
  const { data } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('store_id', storeId)
    .maybeSingle()

  return data?.plan === 'pro' && data?.status === 'active'
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
