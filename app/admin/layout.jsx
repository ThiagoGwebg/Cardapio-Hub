import { requireAdmin } from '@/lib/admin'
import { brandIcons } from '@/lib/brandIcons'
import AdminNav from './AdminNav'
import './admin.css'

export const metadata = {
  manifest: '/admin/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Painel Cardápio Hub' },
  icons: brandIcons('/admin/app-icon.svg'),
  robots: { index: false, follow: false },
}

export const viewport = {
  themeColor: '#0a0c11',
}

export default async function AdminLayout({ children }) {
  const { user } = await requireAdmin()

  return (
    <div className="adm-shell">
      <AdminNav email={user.email || ''} />
      <div className="adm-main">{children}</div>
    </div>
  )
}
