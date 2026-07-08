import { getCurrentStore } from '@/lib/store'
import { fmtCents, fmtSince } from '@/lib/format'
import { getStoreUsage } from '@/lib/plan'
import Link from 'next/link'
import OnboardingChecklist from '@/components/dashboard/OnboardingChecklist'

export default async function DashboardHomePage() {
  const { supabase, store } = await getCurrentStore()

  // Busca dados para o resumo
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [{ data: todayOrders }, { data: allOrders }, { count: productCount }, usage] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total_cents, status')
      .eq('store_id', store.id)
      .gte('created_at', todayStart.toISOString())
      .neq('status', 'cancelado'),
    supabase
      .from('orders')
      .select('id, order_number, customer_name, total_cents, status, order_type, created_at')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store.id)
      .eq('is_active', true),
    getStoreUsage(supabase, store.id),
  ])

  const todayRevenue = (todayOrders ?? []).reduce((s, o) => s + o.total_cents, 0)
  const todayCount = (todayOrders ?? []).length

  // Determina etapa do onboarding
  const hasProducts = (productCount ?? 0) > 0
  const hasOrders = (allOrders ?? []).length > 0
  const hasLogo = Boolean(store.logo_url)
  const hasAddress = Boolean(store.address)

  return (
    <>
      <div className="dash-header">
        <div className="dash-title">Início</div>
      </div>

      {/* Onboarding Checklist */}
      <OnboardingChecklist
        hasProducts={hasProducts}
        hasOrders={hasOrders}
        hasLogo={hasLogo}
        hasAddress={hasAddress}
        storeName={store.name}
        isPro={usage.isPro}
      />

      {/* Cards de resumo */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Pedidos hoje</div>
          <div className="stat-value">{todayCount}</div>
          <div className="stat-sub">{store.is_open ? 'Loja aberta' : 'Loja fechada'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Faturamento hoje</div>
          <div className="stat-value">{fmtCents(todayRevenue)}</div>
          <div className="stat-sub">pedidos concluídos e em andamento</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Produtos ativos</div>
          <div className="stat-value">{productCount}</div>
          <div className="stat-sub">no cardápio online</div>
        </div>
        {!usage.isPro && (
          <div className="stat-card">
            <div className="stat-label">Pedidos no mês</div>
            <div className="stat-value">{usage.ordersThisMonth}/{usage.maxOrdersPerMonth}</div>
            <div className="stat-sub amber">Plano Lite</div>
          </div>
        )}
        {usage.isPro && (
          <div className="stat-card">
            <div className="stat-label">Plano</div>
            <div className="stat-value" style={{ color: 'var(--teal)' }}>Pro</div>
            <div className="stat-sub">ilimitado</div>
          </div>
        )}
      </div>

      {/* Ações rápidas */}
      <div className="dash-section">
        <div className="dash-section-title">Ações rápidas</div>
        <div className="quick-actions">
          <Link href="/dashboard/cardapio" className="quick-action-card">
            <span className="qa-icon">🍽️</span>
            <span className="qa-label">Adicionar produto</span>
            <span className="qa-desc">Cadastre itens no seu cardápio</span>
          </Link>
          <Link href="/dashboard/links" className="quick-action-card">
            <span className="qa-icon">🔗</span>
            <span className="qa-label">Compartilhar link</span>
            <span className="qa-desc">Divulgue seu cardápio online</span>
          </Link>
          <Link href="/dashboard/loja" className="quick-action-card">
            <span className="qa-icon">⚙️</span>
            <span className="qa-label">Configurar loja</span>
            <span className="qa-desc">Horários, endereço e mais</span>
          </Link>
          <Link href="/dashboard/ajuda" className="quick-action-card">
            <span className="qa-icon">💡</span>
            <span className="qa-label">Central de Ajuda</span>
            <span className="qa-desc">Dicas e guia rápido</span>
          </Link>
        </div>
      </div>

      {/* Últimos pedidos */}
      <div className="dash-section">
        <div className="dash-section-title">
          Últimos pedidos
          <Link href="/dashboard/pedidos" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', marginLeft: 'auto' }}>
            Ver todos →
          </Link>
        </div>
        {allOrders && allOrders.length > 0 ? (
          <div className="recent-orders-list">
            {allOrders.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/pedidos/${order.id}`}
                className="recent-order-row"
              >
                <div className="ro-left">
                  <div className="ro-num">
                    {order.order_number ? `Nº ${order.order_number}` : `#${order.id.slice(0, 8)}`}
                  </div>
                  <div className="ro-client">{order.customer_name || 'Cliente'}</div>
                </div>
                <div className="ro-center">
                  <span className={`order-type-badge ${order.order_type === 'delivery' ? 'badge-entrega' : 'badge-retirada'}`}>
                    {order.order_type === 'delivery' ? 'Entrega' : order.order_type === 'pickup' ? 'Retirada' : 'Na mesa'}
                  </span>
                </div>
                <div className="ro-right">
                  <div className="ro-price">{fmtCents(order.total_cents)}</div>
                  <div className="ro-time">{fmtSince(order.created_at)}</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span style={{ fontSize: 40, opacity: 0.2 }}>📋</span>
            <p>Nenhum pedido ainda. Compartilhe seu link e comece a vender!</p>
          </div>
        )}
      </div>
    </>
  )
}
