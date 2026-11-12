import { brandIcons } from '@/lib/brandIcons'
import { getCurrentStore } from '@/lib/store'
import { resolveStoreOpen } from '@/lib/openingHours'
import DashboardShell from './DashboardShell'
import SuspendedGate from './SuspendedGate'
import BillingBanner from './BillingBanner'
import SetupModeBanner from './SetupModeBanner'

export const metadata = {
  manifest: '/dashboard/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Painel Cardápio Hub' },
  icons: brandIcons('/dashboard/app-icon.svg'),
  robots: { index: false, follow: false },
}

export const viewport = {
  themeColor: '#FF5722',
}

export default async function DashboardLayout({ children }) {
  const { supabase, user, store } = await getCurrentStore()

  // Montagem assistida: o time libera o painel antes do 1º pagamento para montar o
  // cardápio junto com o cliente. O cardápio público e os pedidos seguem bloqueados.
  let setupUnlocked = false
  if (store.billing_suspended) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('setup_unlocked')
      .eq('store_id', store.id)
      .maybeSingle()
    setupUnlocked = !!sub?.setup_unlocked
  }

  const shellStore = {
    id: store.id,
    name: store.name,
    address: store.address,
    is_open: store.is_open,
    opening_hours: store.opening_hours,
    auto_hours: store.auto_hours,
    // Só a logo: o avatar da sidebar precisa dela, e o resto do tema é do cardápio.
    theme: { logoUrl: store.theme?.logoUrl ?? null },
    // Atalho "Ver meu cardápio" da sidebar.
    slug: store.slug,
  }
  // Conta no rodapé da sidebar. O cadastro não pede nome, então o e-mail é a
  // identificação garantida; o nome só aparece se existir no metadata.
  const account = {
    email: user.email ?? '',
    name: user.user_metadata?.full_name || user.user_metadata?.name || null,
  }
  // Mesmo cálculo do cardápio público: o badge do painel precisa dizer a mesma
  // coisa que o cliente vê, incluindo a grade de dias/horários.
  const initialOpen = resolveStoreOpen(shellStore, new Date())

  // Mensalidade suspensa: o painel inteiro dá lugar à tela de pagamento.
  // `stores.billing_suspended` é mantida por trigger a partir de subscriptions.billing_status.
  if (store.billing_suspended && !setupUnlocked) {
    return (
      <DashboardShell store={shellStore} account={account} initialOpen={initialOpen}>
        <SuspendedGate storeId={store.id} />
      </DashboardShell>
    )
  }

  return (
    <DashboardShell store={shellStore} account={account} initialOpen={initialOpen}>
      {store.billing_suspended ? <SetupModeBanner /> : <BillingBanner storeId={store.id} />}
      {children}
    </DashboardShell>
  )
}
