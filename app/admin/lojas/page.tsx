import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import PlanToggle from './PlanToggle'

export const metadata: Metadata = {
  title: 'Lojas — Admin CardápioÁgil',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type StoreRow = {
  id: string
  owner_id: string
  slug: string
  name: string
  whatsapp_number: string | null
  is_open: boolean
  created_at: string
  subscriptions: { plan: string; status: string } | { plan: string; status: string }[] | null
}

export default async function AdminStoresPage() {
  await requireAdmin()
  const supabase = createAdminClient()

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [storesRes, ordersRes, usersRes] = await Promise.all([
    supabase
      .from('stores')
      .select('id, owner_id, slug, name, whatsapp_number, is_open, created_at, subscriptions(plan, status)')
      .order('created_at', { ascending: false }),
    supabase
      .from('orders')
      .select('store_id')
      .neq('status', 'cancelado')
      .gte('created_at', monthStart.toISOString()),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const stores = (storesRes.data || []) as StoreRow[]

  const ordersByStore = new Map<string, number>()
  for (const o of ordersRes.data || []) {
    ordersByStore.set(o.store_id, (ordersByStore.get(o.store_id) || 0) + 1)
  }

  const emailByUser = new Map<string, string>()
  for (const u of usersRes.data?.users || []) {
    if (u.email) emailByUser.set(u.id, u.email)
  }

  return (
    <main className="adm-page">
      <h1 className="adm-title">Lojas</h1>
      <p className="adm-subtitle">
        {stores.length} loja{stores.length === 1 ? '' : 's'} · troque o plano na hora, sem mexer no banco.
      </p>

      <div className="adm-store-list">
        {stores.map((store) => {
          const sub = Array.isArray(store.subscriptions) ? store.subscriptions[0] : store.subscriptions
          const isPro = sub?.plan === 'pro' && sub?.status === 'active'
          const orders = ordersByStore.get(store.id) || 0
          const email = emailByUser.get(store.owner_id)

          return (
            <article key={store.id} className="adm-store-card">
              <div className="adm-store-main">
                <div className="adm-store-name">
                  {store.name}
                  <span className={`adm-badge ${isPro ? 'pro' : ''}`}>{isPro ? '★ Pro' : 'Lite'}</span>
                  {!store.is_open && <span className="adm-badge closed">Fechada</span>}
                </div>
                <div className="adm-store-meta">
                  {email && <span title="Dono da loja">👤 {email}</span>}
                  <span>📦 {orders} pedido{orders === 1 ? '' : 's'} no mês</span>
                  <span>
                    📅 desde{' '}
                    {new Date(store.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
              <div className="adm-store-actions">
                <a className="adm-btn ghost" href={`/loja/${store.slug}`} target="_blank" rel="noopener noreferrer">
                  Ver cardápio ↗
                </a>
                <PlanToggle storeId={store.id} isPro={isPro} />
              </div>
            </article>
          )
        })}

        {stores.length === 0 && (
          <p className="adm-panel-empty">Nenhuma loja criada ainda.</p>
        )}
      </div>
    </main>
  )
}
