import type { Metadata, Viewport } from 'next'
import { requireAdmin } from '@/lib/admin'
import AdminNav from './AdminNav'
import './admin.css'

export const metadata: Metadata = {
  manifest: '/admin/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Painel CardápioÁgil' },
  icons: { apple: '/admin/app-icon.svg' },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#0a0c11',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin()

  return (
    <div className="adm-shell">
      <AdminNav email={user.email || ''} />
      <div className="adm-main">{children}</div>
    </div>
  )
}
