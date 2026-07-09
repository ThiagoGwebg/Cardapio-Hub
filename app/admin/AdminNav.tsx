'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import InstallAppButton from './InstallAppButton'

const LINKS = [
  {
    href: '/admin',
    label: 'Visão geral',
    exact: true,
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/admin/leads',
    label: 'Leads',
    exact: false,
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/admin/lojas',
    label: 'Lojas',
    exact: false,
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l1.5-5h15L21 9" />
        <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
        <path d="M5 11.5V21h14v-9.5" />
        <path d="M9 21v-6h6v6" />
      </svg>
    ),
  },
] as const

export default function AdminNav({ email }: { email: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="adm-nav">
      <Link href="/admin" className="adm-brand">
        <span className="adm-brand-mark">⚡</span>
        <span className="adm-brand-text">
          CardápioÁgil
          <small>Painel do time</small>
        </span>
      </Link>

      <div className="adm-links">
        {LINKS.map((l) => {
          const active = l.exact ? pathname === l.href : pathname.startsWith(l.href)
          return (
            <Link key={l.href} href={l.href} className={`adm-link ${active ? 'active' : ''}`}>
              {l.icon}
              <span>{l.label}</span>
            </Link>
          )
        })}
      </div>

      <div className="adm-nav-foot">
        <InstallAppButton />
        <div className="adm-nav-user" title={email}>
          <span className="adm-nav-avatar">{(email[0] || '?').toUpperCase()}</span>
          <span className="adm-nav-email">{email}</span>
        </div>
        <button className="adm-logout" onClick={logout} title="Sair">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Sair</span>
        </button>
      </div>
    </nav>
  )
}
