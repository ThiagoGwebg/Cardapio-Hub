import { getCurrentStore } from '@/lib/store'
import OrderAlertsSettings from './OrderAlertsSettings'

export default async function NotificacoesPage() {
  const { store } = await getCurrentStore()

  return (
    <>
      <div className="dash-header">
        <div className="dash-title">Notificações</div>
      </div>

      <OrderAlertsSettings storeId={store.id} />
    </>
  )
}
