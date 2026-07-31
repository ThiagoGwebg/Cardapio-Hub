import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { spMonthStart } from '@/lib/format'
import StoresBoard, { type AdminStore } from './StoresBoard'
import { DEFAULT_PLAN_PRICE_CENTS, DEFAULT_GRACE_DAYS } from '@/lib/billing/plans'

export const metadata: Metadata = {
  title: 'Lojas — Admin Cardápio Hub',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type StoreRow = {
  id: string
  owner_id: string
  slug: string
  name: string
  is_open: boolean
  created_at: string
  mp_connected: boolean | null
  subscriptions: SubRow | SubRow[] | null
}

type SubRow = {
  plan: string
  status: string
  billing_enabled: boolean | null
  billing_status: string | null
  price_cents: number | null
  next_due_date: string | null
  grace_days: number | null
  setup_unlocked: boolean | null
}

type StoreStat = { store_id: string; orders: number; gmv_cents: number }

export default async function AdminStoresPage() {
  await requireAdmin()
  const supabase = createAdminClient()

  const monthStart = spMonthStart(new Date(), 0)

  const [storesRes, statsRes, usersRes, credsRes] = await Promise.all([
    supabase
      .from('stores')
      .select(
        'id, owner_id, slug, name, is_open, created_at, mp_connected, subscriptions(plan, status, billing_enabled, billing_status, price_cents, next_due_date, grace_days, setup_unlocked)'
      )
      .order('created_at', { ascending: false }),
    supabase.rpc('admin_store_stats', { p_month_start: monthStart.toISOString() }),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabase.from('store_payment_credentials').select('store_id, mp_user_id'),
  ])

  const rows = (storesRes.data || []) as StoreRow[]

  const statByStore = new Map<string, StoreStat>()
  for (const s of (statsRes.data || []) as StoreStat[]) statByStore.set(s.store_id, s)

  const mpUserByStore = new Map<string, string>()
  for (const c of (credsRes.data || []) as { store_id: string; mp_user_id: string | null }[]) {
    if (c.mp_user_id) mpUserByStore.set(c.store_id, c.mp_user_id)
  }

  const emailByUser = new Map<string, string>()
  for (const u of usersRes.data?.users || []) {
    if (u.email) emailByUser.set(u.id, u.email)
  }

  const stores: AdminStore[] = rows.map((store) => {
    const sub = Array.isArray(store.subscriptions) ? store.subscriptions[0] : store.subscriptions
    const stat = statByStore.get(store.id)
    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      email: emailByUser.get(store.owner_id),
      isPro: sub?.plan === 'pro' && sub?.status === 'active',
      isOpen: store.is_open,
      orders: stat?.orders ?? 0,
      gmvCents: stat?.gmv_cents ?? 0,
      createdAt: store.created_at,
      mpConnected: !!store.mp_connected,
      mpUserId: mpUserByStore.get(store.id),
      billing: {
        enabled: !!sub?.billing_enabled,
        status: (sub?.billing_status as 'current' | 'past_due' | 'suspended') ?? 'current',
        priceCents: sub?.price_cents ?? DEFAULT_PLAN_PRICE_CENTS[sub?.plan === 'pro' ? 'pro' : 'free'],
        planLabel: sub?.plan === 'pro' ? 'Pro' : 'Lite',
        nextDueDate: sub?.next_due_date ?? null,
        graceDays: sub?.grace_days ?? DEFAULT_GRACE_DAYS,
        setupUnlocked: !!sub?.setup_unlocked,
      },
    }
  })

  return (
    <main className="adm-page">
      <h1 className="adm-title">Lojas</h1>
      <p className="adm-subtitle">
        {stores.length} loja{stores.length === 1 ? '' : 's'} · troque o plano na hora, sem mexer no banco.
      </p>

      <StoresBoard stores={stores} />
    </main>
  )
}
