import { requireAdmin } from '@/lib/admin'
import AdminNav from './AdminNav'
import './admin.css'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin()

  return (
    <div className="adm-shell">
      <AdminNav email={user.email || ''} />
      <div className="adm-main">{children}</div>
    </div>
  )
}
