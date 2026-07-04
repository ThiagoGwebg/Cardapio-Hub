import Link from 'next/link'
import { getCurrentStore } from '@/lib/store'
import LogoutButton from './LogoutButton'

const NAV_PRINCIPAL = [
  { href: '/dashboard/pedidos', label: 'Pedidos' },
  { href: '/dashboard/cardapio', label: 'Cardápio' },
  { href: '/dashboard/desempenho', label: 'Desempenho' },
  { href: '/dashboard/caixa', label: 'Caixa' },
]

const NAV_CONFIG = [
  { href: '/dashboard/loja', label: 'Minha Loja' },
  { href: '/dashboard/notificacoes', label: 'Notificações' },
  { href: '/dashboard/links', label: 'Meus Links' },
  { href: '/dashboard/billing', label: 'Assinatura' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { store } = await getCurrentStore()

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-logo">
          cardápio<span>ágil</span>
        </div>
        <div className="sidebar-store">
          <div className="sidebar-store-name">{store.name}</div>
          <div className="sidebar-store-loc">{store.address || 'Endereço não definido'}</div>
          <div className="open-badge">{store.is_open ? '● Aberto' : '● Fechado'}</div>
        </div>

        <div className="nav-section-title">Principal</div>
        {NAV_PRINCIPAL.map((item) => (
          <Link key={item.href} href={item.href} className="nav-item">
            {item.label}
          </Link>
        ))}

        <div className="nav-section-title">Configurações</div>
        {NAV_CONFIG.map((item) => (
          <Link key={item.href} href={item.href} className="nav-item">
            {item.label}
          </Link>
        ))}

        <div style={{ marginTop: 'auto', padding: '18px' }}>
          <LogoutButton />
        </div>
      </aside>
      <main className="dash-content">{children}</main>
    </div>
  )
}
