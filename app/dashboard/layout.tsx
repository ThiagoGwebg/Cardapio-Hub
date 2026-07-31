import type { Metadata, Viewport } from 'next'
import { brandIcons } from '@/lib/brandIcons'
import { getCurrentStore } from '@/lib/store'
import DashboardShell from './DashboardShell'
import SuspendedGate from './SuspendedGate'
import BillingBanner from './BillingBanner'
import SetupModeBanner from './SetupModeBanner'

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
  const { supabase, store } = await getCurrentStore()

  // Montagem assistida: o time libera o painel antes do 1º pagamento para montar o
  // cardápio junto com o cliente. O cardápio público e os pedidos seguem bloqueados.
  let setupUnlocked = false
  if (store.billing_suspended) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('setup_unlocked')
      .eq('store_id', store.id)
      .maybeSingle<{ setup_unlocked: boolean }>()
    setupUnlocked = !!sub?.setup_unlocked
  }

  const shellStore = { id: store.id, name: store.name, address: store.address, is_open: store.is_open }

  // Mensalidade suspensa: o painel inteiro dá lugar à tela de pagamento.
  // `stores.billing_suspended` é mantida por trigger a partir de subscriptions.billing_status.
  if (store.billing_suspended && !setupUnlocked) {
    return (
      <DashboardShell store={shellStore}>
        <SuspendedGate storeId={store.id} />
      </DashboardShell>
    )
  }

  return (
    <DashboardShell store={shellStore}>
      {store.billing_suspended ? <SetupModeBanner /> : <BillingBanner storeId={store.id} />}
      {children}
    </DashboardShell>
  )
}
