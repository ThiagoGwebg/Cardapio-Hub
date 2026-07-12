import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isStorePro } from '@/lib/plan'
import { notFound } from 'next/navigation'
import PublicMenu from './PublicMenu'

export default async function LojaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: store } = await supabase
    .from('store_public')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!store) notFound()

  // Selo "Feito com CardápioÁgil" aparece só em lojas Free (white-label é Pro).
  // subscriptions não é legível pelo anon (RLS), então usamos o client admin no servidor.
  const isPro = await isStorePro(createAdminClient(), store.id)

  const { data: categories } = await supabase
    .from('categories')
    .select(
      'id, name, emoji, sort_order, products(id, name, description, price_cents, image_url, images, is_active, sort_order, product_option_groups(id, name, min_select, max_select, required, sort_order, product_options(id, name, price_delta_cents, is_active, sort_order, image_url, description)))'
    )
    .eq('store_id', store.id)
    .order('sort_order', { ascending: true })

  const { data: zones } = await supabase
    .from('delivery_zones')
    .select('neighborhood, fee_cents, min_order_cents')
    .eq('store_id', store.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  type RawGroup = {
    id: string
    name: string
    min_select: number
    max_select: number
    required: boolean
    sort_order: number
    product_options: {
      id: string
      name: string
      price_delta_cents: number
      is_active: boolean
      sort_order: number
      image_url: string | null
      description: string | null
    }[]
  }
  type RawProduct = {
    id: string
    name: string
    description: string | null
    price_cents: number
    image_url: string | null
    images: string[] | null
    is_active: boolean
    sort_order: number
    product_option_groups: RawGroup[]
  }

  const menu = (categories ?? [])
    .map((c) => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      products: ((c.products ?? []) as RawProduct[])
        .filter((p) => p.is_active)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price_cents: p.price_cents,
          image_url: p.image_url,
          images: (Array.isArray(p.images) ? p.images.filter(Boolean) : []).length
            ? (p.images as string[]).filter(Boolean)
            : p.image_url
              ? [p.image_url]
              : [],
          is_active: p.is_active,
          groups: (p.product_option_groups ?? [])
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((g) => ({
              id: g.id,
              name: g.name,
              min_select: g.min_select,
              max_select: g.max_select,
              required: g.required,
              options: (g.product_options ?? [])
                .filter((o) => o.is_active)
                .sort((a, b) => a.sort_order - b.sort_order),
            })),
        })),
    }))
    .filter((c) => c.products.length > 0)

  return <PublicMenu store={store} menu={menu} zones={zones ?? []} showBranding={!isPro} />
}
