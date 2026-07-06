import { getCurrentStore } from '@/lib/store'
import { fmtCents } from '@/lib/format'
import { isStorePro } from '@/lib/plan'
import { ProLockedSection } from '@/components/dashboard/ProUpsell'

type OrderRow = {
  customer_name: string
  customer_phone: string | null
  subtotal_cents: number
  created_at: string
}

type Customer = {
  name: string
  phone: string
  orders: number
  total_cents: number
  last_order: string
}

export default async function ClientesPage() {
  const { supabase, store } = await getCurrentStore()
  const isPro = await isStorePro(supabase, store.id)

  if (!isPro) {
    return (
      <>
        <div className="dash-header">
          <div className="dash-title">Clientes</div>
        </div>
        <ProLockedSection
          title="Clientes fiéis"
          text="Saiba quem são seus melhores clientes: quantas vezes pediram, quanto já gastaram e quando voltaram. Perfeito para mandar promoções no WhatsApp de quem já compra de você."
        >
          <div className="history-table" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Pedidos</th>
                  <th>Total gasto</th>
                  <th>Último pedido</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Maria S.', 14, 'R$ 682,00', 'há 2 dias'],
                  ['João P.', 11, 'R$ 540,50', 'ontem'],
                  ['Ana C.', 9, 'R$ 431,90', 'há 5 dias'],
                  ['Carlos M.', 7, 'R$ 350,00', 'hoje'],
                ].map(([n, p, t, u]) => (
                  <tr key={String(n)}>
                    <td>{n}</td>
                    <td>{p}</td>
                    <td className="td-price">{t}</td>
                    <td>{u}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ProLockedSection>
      </>
    )
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('customer_name, customer_phone, subtotal_cents, created_at')
    .eq('store_id', store.id)
    .neq('status', 'cancelado')
    .order('created_at', { ascending: false })

  // Agrupa por telefone (fallback: nome) — sem telefone não há como identificar retorno.
  const map = new Map<string, Customer>()
  ;((orders ?? []) as OrderRow[]).forEach((o) => {
    const key = (o.customer_phone || '').replace(/\D/g, '') || `nome:${o.customer_name.trim().toLowerCase()}`
    const existing = map.get(key)
    if (existing) {
      existing.orders += 1
      existing.total_cents += o.subtotal_cents
      if (o.created_at > existing.last_order) existing.last_order = o.created_at
    } else {
      map.set(key, {
        name: o.customer_name,
        phone: o.customer_phone ?? '',
        orders: 1,
        total_cents: o.subtotal_cents,
        last_order: o.created_at,
      })
    }
  })

  const customers = Array.from(map.values()).sort((a, b) => b.total_cents - a.total_cents)
  const recorrentes = customers.filter((c) => c.orders >= 2).length
  const taxaRecorrencia = customers.length ? Math.round((recorrentes / customers.length) * 100) : 0

  return (
    <>
      <div className="dash-header">
        <div className="dash-title">Clientes</div>
        <span className="pro-badge">Pro</span>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Clientes únicos</div>
          <div className="stat-value">{customers.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Clientes recorrentes</div>
          <div className="stat-value">{recorrentes}</div>
          <div className="stat-sub">pediram 2+ vezes</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Taxa de recorrência</div>
          <div className="stat-value">{taxaRecorrencia}%</div>
        </div>
      </div>

      <div className="history-table">
        <div className="history-header">
          <div className="history-title">Ranking de clientes</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Telefone</th>
              <th>Pedidos</th>
              <th>Total gasto</th>
              <th>Último pedido</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers.slice(0, 100).map((c, i) => (
              <tr key={`${c.phone}-${c.name}-${i}`}>
                <td>
                  {c.name}
                  {c.orders >= 5 && <span className="vip-badge">VIP</span>}
                </td>
                <td>{c.phone || '—'}</td>
                <td>{c.orders}</td>
                <td className="td-price">{fmtCents(c.total_cents)}</td>
                <td>{new Date(c.last_order).toLocaleDateString('pt-BR')}</td>
                <td>
                  {c.phone && (
                    <a
                      className="ordertype-btn"
                      style={{ flex: 'none', padding: '4px 10px', textDecoration: 'none', fontSize: 12 }}
                      href={`https://wa.me/55${c.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener"
                    >
                      WhatsApp
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 13, padding: 16 }}>
            Ainda não há clientes — eles aparecem aqui assim que os primeiros pedidos chegarem.
          </p>
        )}
      </div>
    </>
  )
}
