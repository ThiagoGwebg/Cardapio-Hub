import Link from 'next/link'
import { getCurrentStore } from '@/lib/store'
import { getStoreUsage } from '@/lib/plan'
import { UsageMeter, ProUpsellBanner } from '@/components/dashboard/ProUpsell'
import ManualOrderForm from './ManualOrderForm'

export default async function NovoPedidoPage() {
  const { supabase, store } = await getCurrentStore()

  const [{ data: categories }, usage] = await Promise.all([
    supabase
      .from('categories')
      .select(
        'id, name, emoji, sort_order, products(id, name, price_cents, image_url, is_active, sort_order, product_option_groups(id, name, min_select, max_select, required, sort_order, product_options(id, name, price_delta_cents, image_url, description, is_active, sort_order)))'
      )
      .eq('store_id', store.id)
      .order('sort_order', { ascending: true }),
    getStoreUsage(supabase, store.id),
  ])

  type RawOption = {
    id: string
    name: string
    price_delta_cents: number
    image_url: string | null
    description: string | null
    is_active: boolean
    sort_order: number
  }
  type RawGroup = {
    id: string
    name: string
    min_select: number
    max_select: number
    required: boolean
    sort_order: number
    product_options: RawOption[]
  }
  type RawProduct = {
    id: string
    name: string
    price_cents: number
    image_url: string | null
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
          price_cents: p.price_cents,
          image_url: p.image_url,
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
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((o) => ({
                  id: o.id,
                  name: o.name,
                  price_delta_cents: o.price_delta_cents,
                  image_url: o.image_url,
                  description: o.description,
                })),
            })),
        })),
    }))
    .filter((c) => c.products.length > 0)

  const atOrderLimit = !usage.isPro && usage.ordersThisMonth >= usage.maxOrdersPerMonth

  return (
    <>
      <div className="dash-header">
        <div>
          <div className="dash-title">Registrar pedido</div>
          <div className="dash-subtitle">Pedido feito presencialmente, no balcão ou na mesa</div>
        </div>
        <Link href="/dashboard/pedidos" className="ordertype-btn" style={{ flex: 'none', padding: '8px 14px', textDecoration: 'none' }}>
          ← Voltar
        </Link>
      </div>

      {!usage.isPro && (
        <div className="settings-card">
          <UsageMeter label="Pedidos do mês (plano Lite)" used={usage.ordersThisMonth} limit={usage.maxOrdersPerMonth} />
          {atOrderLimit && (
            <ProUpsellBanner
              title="Limite de pedidos do mês atingido"
              text="Pedidos manuais também contam no limite de 60 pedidos do plano Lite. Assine o Pro para registrar pedidos ilimitados."
            />
          )}
        </div>
      )}

      {menu.length === 0 ? (
        <div className="settings-card">
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Você ainda não tem produtos ativos no cardápio.{' '}
            <Link href="/dashboard/cardapio" style={{ color: 'var(--primary)' }}>
              Cadastre produtos
            </Link>{' '}
            para registrar pedidos.
          </p>
        </div>
      ) : (
        <ManualOrderForm menu={menu} disabled={atOrderLimit} />
      )}
    </>
  )
}
