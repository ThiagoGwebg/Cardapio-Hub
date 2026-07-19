import Link from 'next/link'
import { getCurrentStore } from '@/lib/store'
import { fmtCents } from '@/lib/format'
import { getStoreUsage } from '@/lib/plan'
import { UsageMeter, ProUpsellBanner } from '@/components/dashboard/ProUpsell'
import OrdersList from '@/components/orders/OrdersList'
import SignupTracker from '@/components/analytics/SignupTracker'

export default async function PedidosPage() {
  const { supabase, store } = await getCurrentStore()

  const [{ data: orders }, usage] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, status, order_type, payment_method, customer_name, customer_phone, subtotal_cents, delivery_fee_cents, total_cents, table_number, address_cep, address_street, address_number, address_neighborhood, created_at, scheduled_for, order_items(id, product_name_snapshot, quantity, order_item_options(name_snapshot))')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false }),
    getStoreUsage(supabase, store.id),
  ])

  const nearOrderLimit = !usage.isPro && usage.ordersThisMonth >= usage.maxOrdersPerMonth * 0.8

  const allOrders = orders ?? []
  const prepCount = allOrders.filter((o) => o.status === 'preparando').length
  const total = allOrders.length
  const faturamento = allOrders
    .filter((o) => o.status !== 'cancelado')
    .reduce((s, o) => s + o.total_cents, 0)

  return (
    <>
      <SignupTracker />
      <div className="dash-header">
        <div className="dash-title">Pedidos</div>
        <Link href="/dashboard/pedidos/novo" className="save-btn" style={{ textDecoration: 'none' }}>
          + Registrar pedido
        </Link>
      </div>

      {!usage.isPro && (
        <div className="settings-card">
          <UsageMeter label="Pedidos do mês (plano Lite)" used={usage.ordersThisMonth} limit={usage.maxOrdersPerMonth} />
          {nearOrderLimit && (
            <ProUpsellBanner
              title="Você está perto do limite de pedidos"
              text="No plano Lite são 60 pedidos por mês. Assine o Pro e nunca mais deixe uma venda passar."
            />
          )}
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Pedidos</div>
          <div className="stat-value">{total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Faturamento</div>
          <div className="stat-value">{fmtCents(faturamento)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Em preparo</div>
          <div className="stat-value">{prepCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ticket médio</div>
          <div className="stat-value">{total ? fmtCents(Math.round(faturamento / total)) : 'R$ 0,00'}</div>
        </div>
      </div>

      <OrdersList storeId={store.id} storeName={store.name} orders={allOrders as never} />
    </>
  )
}
