'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'
import './dashboard.css'

const NAV_PRINCIPAL = [
  { href: '/dashboard', label: 'Início' },
  { href: '/dashboard/pedidos', label: 'Pedidos' },
  { href: '/dashboard/cardapio', label: 'Cardápio' },
  { href: '/dashboard/desempenho', label: 'Desempenho' },
  { href: '/dashboard/clientes', label: 'Clientes' },
  { href: '/dashboard/caixa', label: 'Caixa' },
]

const NAV_CONFIG = [
  { href: '/dashboard/loja', label: 'Minha Loja' },
  { href: '/dashboard/notificacoes', label: 'Notificações' },
  { href: '/dashboard/links', label: 'Meus Links' },
  { href: '/dashboard/billing', label: 'Assinatura' },
  { href: '/dashboard/ajuda', label: 'Ajuda' },
]

type Store = { name: string; address: string | null; is_open: boolean }

export default function DashboardShell({ store, children }: { store: Store; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Destaca "Início" quando está exatamente em /dashboard
  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  function NavLinks() {
    return (
      <>
        <div className="nav-section-title">Principal</div>
        {NAV_PRINCIPAL.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </Link>
        ))}

        <div className="nav-section-title">Configurações</div>
        {NAV_CONFIG.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </Link>
        ))}
      </>
    )
  }

  return (
    <div className="dashboard">
      <div className="mobile-topbar">
        <button className="mobile-menu-btn" onClick={() => setOpen(true)} aria-label="Abrir menu">
          <span /><span /><span />
        </button>
        <div className="mobile-topbar-title">
          cardápio<span>ágil</span>
        </div>
        <span className={`open-badge ${store.is_open ? '' : 'is-closed-badge'}`}>{store.is_open ? '● Aberto' : '● Fechado'}</span>
      </div>

      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Fechar menu">✕</button>
        <div className="sidebar-logo">
          cardápio<span>ágil</span>
        </div>
        <div className="sidebar-store">
          <div className="sidebar-store-name">{store.name}</div>
          <div className="sidebar-store-loc">{store.address || 'Endereço não definido'}</div>
          <div className="open-badge">{store.is_open ? '● Aberto' : '● Fechado'}</div>
        </div>

        <NavLinks />

        <div style={{ marginTop: 'auto', padding: '18px' }}>
          <LogoutButton />
        </div>
      </aside>
      <main className="dash-content">{children}</main>
    </div>
  )
}
