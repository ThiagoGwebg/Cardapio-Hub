import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = {
  title: 'Admin — CardápioÁgil',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminHomePage() {
  await requireAdmin()
  const supabase = createAdminClient()

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [leadsRes, storesRes, subsRes, ordersRes, recentLeadsRes] = await Promise.all([
    supabase.from('leads').select('status'),
    supabase.from('stores').select('id', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('plan, status'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'cancelado')
      .gte('created_at', monthStart.toISOString()),
    supabase
      .from('leads')
      .select('id, name, company, status, created_at')
      .eq('status', 'novo')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const leads = leadsRes.data || []
  const leadCounts = {
    novo: leads.filter((l) => l.status === 'novo').length,
    contatado: leads.filter((l) => l.status === 'contatado').length,
    fechado: leads.filter((l) => l.status === 'fechado').length,
    total: leads.length,
  }
  const conversion = leadCounts.total > 0 ? Math.round((leadCounts.fechado / leadCounts.total) * 100) : 0
  const proCount = (subsRes.data || []).filter((s) => s.plan === 'pro' && s.status === 'active').length
  const storeCount = storesRes.count ?? 0
  const ordersMonth = ordersRes.count ?? 0
  const recentLeads = recentLeadsRes.data || []

  return (
    <main className="adm-page">
      <h1 className="adm-title">Visão geral</h1>
      <p className="adm-subtitle">O pulso do CardápioÁgil num lugar só.</p>

      <div className="adm-stats">
        <Link href="/admin/leads" className="adm-stat highlight">
          <span className="adm-stat-num">{leadCounts.novo}</span>
          <span className="adm-stat-label">Leads pendentes</span>
        </Link>
        <Link href="/admin/leads" className="adm-stat">
          <span className="adm-stat-num">{leadCounts.contatado}</span>
          <span className="adm-stat-label">Em contato</span>
        </Link>
        <Link href="/admin/leads" className="adm-stat">
          <span className="adm-stat-num green">{leadCounts.fechado}</span>
          <span className="adm-stat-label">Clientes fechados</span>
        </Link>
        <div className="adm-stat">
          <span className="adm-stat-num">{conversion}%</span>
          <span className="adm-stat-label">Conversão</span>
        </div>
        <Link href="/admin/lojas" className="adm-stat">
          <span className="adm-stat-num">{storeCount}</span>
          <span className="adm-stat-label">Lojas ativas</span>
        </Link>
        <Link href="/admin/lojas" className="adm-stat">
          <span className="adm-stat-num pro">{proCount}</span>
          <span className="adm-stat-label">Assinantes Pro</span>
        </Link>
        <div className="adm-stat">
          <span className="adm-stat-num">{ordersMonth}</span>
          <span className="adm-stat-label">Pedidos no mês</span>
        </div>
      </div>

      <div className="adm-panels">
        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>Leads aguardando contato</h2>
            <Link href="/admin/leads" className="adm-panel-link">ver todos →</Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="adm-panel-empty">✅ Nenhum lead pendente — tudo em dia!</p>
          ) : (
            <ul className="adm-mini-list">
              {recentLeads.map((l) => (
                <li key={l.id}>
                  <span className="adm-mini-name">{l.name || 'Sem nome'}</span>
                  {l.company && <span className="adm-mini-sub">{l.company}</span>}
                  <span className="adm-mini-date">
                    {new Date(l.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>Atalhos</h2>
          </div>
          <div className="adm-shortcuts">
            <Link href="/admin/leads" className="adm-shortcut">
              📋 <span>Painel de leads<br /><small>aprovar contas, WhatsApp, anotações</small></span>
            </Link>
            <Link href="/admin/lojas" className="adm-shortcut">
              🏪 <span>Todas as lojas<br /><small>planos, pedidos, donos</small></span>
            </Link>
            <Link href="/signup" className="adm-shortcut">
              ➕ <span>Criar loja manual<br /><small>sem passar por lead</small></span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
