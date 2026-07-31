import type { Metadata, Viewport } from 'next'
import { brandIcons } from '@/lib/brandIcons'
import { getCurrentStore } from '@/lib/store'
import DashboardShell from './DashboardShell'

export const metadata: Metadata = {
  manifest: '/dashboard/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Painel Cardápio Hub' },
  icons: brandIcons('/dashboard/app-icon.svg'),
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#FF5722',
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { store } = await getCurrentStore()

  return (
    <DashboardShell store={{ id: store.id, name: store.name, address: store.address, is_open: store.is_open }}>
      {children}
    </DashboardShell>
  )
}
