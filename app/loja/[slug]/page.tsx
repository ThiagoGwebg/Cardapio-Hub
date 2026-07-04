import { createClient } from '@/lib/supabase/server'
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

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, emoji, sort_order, products(id, name, description, price_cents, image_url, is_active, sort_order)')
    .eq('store_id', store.id)
    .order('sort_order', { ascending: true })

  const menu = (categories ?? [])
    .map((c) => ({
      ...c,
      products: (c.products ?? [])
        .filter((p) => p.is_active)
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
    .filter((c) => c.products.length > 0)

  return <PublicMenu store={store} menu={menu} />
}
