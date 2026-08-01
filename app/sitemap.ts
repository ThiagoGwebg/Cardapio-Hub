import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { absoluteUrl } from '@/lib/seo'
import { SEGMENTS } from '@/lib/segments'

// Sitemap dinâmico: páginas institucionais + o cardápio público de cada loja.
// Revalida a cada 6h para novas lojas entrarem no índice sem precisar de deploy.
export const revalidate = 21600

type StoreRow = { slug: string; created_at: string | null; id: string }

/**
 * Ids das lojas que têm pelo menos um produto ativo. Loja com cardápio vazio é
 * thin content: entra no índice, o Google avalia como página sem valor e isso
 * pesa contra o domínio inteiro. Melhor deixar de fora até ter cardápio.
 */
async function getStoresWithMenu(): Promise<Set<string>> {
  try {
    const { data, error } = await createAdminClient()
      .from('products')
      .select('store_id')
      .eq('is_active', true)
      .limit(20000)
    if (error) return new Set()
    return new Set((data ?? []).map((r) => (r as { store_id: string }).store_id))
  } catch {
    return new Set()
  }
}

/**
 * Lê as lojas com o client admin (o sitemap roda só no servidor). Envolvido em
 * try/catch de propósito: sem a service role key configurada, o sitemap ainda
 * precisa responder 200 com as páginas institucionais em vez de estourar 500.
 */
async function getStores(): Promise<StoreRow[]> {
  try {
    const { data, error } = await createAdminClient()
      .from('stores')
      .select('id, slug, created_at')
      .order('created_at', { ascending: false })
      .limit(5000)
    if (error) return []
    return (data ?? []) as StoreRow[]
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/contato'), lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    // Páginas por segmento: é onde a busca do lojista ("sistema para pizzaria")
    // cai. Prioridade alta de propósito — são as landings de aquisição.
    ...SEGMENTS.map((s) => ({
      url: absoluteUrl(`/para/${s.slug}`),
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    })),
    { url: absoluteUrl('/entregadores'), lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/privacidade'), lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]

  const [stores, withMenu] = await Promise.all([getStores(), getStoresWithMenu()])
  const storePages: MetadataRoute.Sitemap = stores
    .filter((s) => !!s.slug && withMenu.has(s.id))
    .map((s) => ({
      url: absoluteUrl(`/loja/${s.slug}`),
      lastModified: s.created_at ? new Date(s.created_at) : now,
      changeFrequency: 'daily' as const,
      // Cardápios de loja são conteúdo real e local — valem mais que páginas legais,
      // e ainda trazem busca de marca ("nome da loja delivery") pro domínio.
      priority: 0.8,
    }))

  return [...staticPages, ...storePages]
}
