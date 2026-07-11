import { getCurrentStore } from '@/lib/store'
import DashboardShell from './DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { store } = await getCurrentStore()

  return (
    <DashboardShell store={{ id: store.id, name: store.name, address: store.address, is_open: store.is_open }}>
      {children}
    </DashboardShell>
  )
}
