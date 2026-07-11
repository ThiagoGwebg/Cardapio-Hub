'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LogoutButton from './LogoutButton'
import ThemeToggle from './ThemeToggle'
import './dashboard.css'

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem('cardapio-dash-theme') || 'light';
    document.documentElement.setAttribute('data-dash-theme', t);
  } catch (e) {}
})();
`

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

type Store = { id: string; name: string; address: string | null; is_open: boolean }

export default function DashboardShell({ store, children }: { store: Store; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [novoCount, setNovoCount] = useState(0)
  const [pulse, setPulse] = useState(false)
  const prevCountRef = useRef(0)
  const pathname = usePathname()

  // Contador de pedidos NOVOS em tempo real — visível de qualquer tela do painel.
  useEffect(() => {
    const supabase = createClient()
    let active = true

    async function refreshCount() {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store.id)
        .eq('status', 'novo')
      if (!active) return
      const c = count ?? 0
      if (c > prevCountRef.current) {
        setPulse(true)
        setTimeout(() => setPulse(false), 1500)
      }
      prevCountRef.current = c
      setNovoCount(c)
    }

    refreshCount()
    const channel = supabase
      .channel(`shell-orders-${store.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${store.id}` },
        refreshCount
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [store.id])

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
            {item.href === '/dashboard/pedidos' && novoCount > 0 && (
              <span className={`nav-badge ${pulse ? 'pulse' : ''}`}>{novoCount}</span>
            )}
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
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      <div className="mobile-topbar">
        <button className="mobile-menu-btn" onClick={() => setOpen(true)} aria-label="Abrir menu">
          <span /><span /><span />
          {novoCount > 0 && <span className={`mobile-menu-badge ${pulse ? 'pulse' : ''}`}>{novoCount}</span>}
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

        <div style={{ marginTop: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </aside>
      <main className="dash-content">{children}</main>
    </div>
  )
}
