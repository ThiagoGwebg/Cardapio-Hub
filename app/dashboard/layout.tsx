import type { Metadata, Viewport } from 'next'
import { brandIcons } from '@/lib/brandIcons'
import { getCurrentStore } from '@/lib/store'
import DashboardShell from './DashboardShell'
import SuspendedGate from './SuspendedGate'
import BillingBanner from './BillingBanner'

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

  // Mensalidade suspensa: o painel inteiro dá lugar à tela de pagamento.
  // `stores.billing_suspended` é mantida por trigger a partir de subscriptions.billing_status.
  if (store.billing_suspended) {
    return (
      <DashboardShell store={{ id: store.id, name: store.name, address: store.address, is_open: store.is_open }}>
        <SuspendedGate storeId={store.id} />
      </DashboardShell>
    )
  }

  return (
    <DashboardShell store={{ id: store.id, name: store.name, address: store.address, is_open: store.is_open }}>
      <BillingBanner storeId={store.id} />
      {children}
    </DashboardShell>
  )
}
