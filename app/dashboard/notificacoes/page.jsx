import { getCurrentStore } from '@/lib/store'
import OrderAlertsSettings from './OrderAlertsSettings'
import AutoPrintSettings from './AutoPrintSettings'

export default async function NotificacoesPage() {
  const { supabase, store } = await getCurrentStore()

  // O teste de impressão precisa de um pedido real como modelo: usa o último.
  const { data: lastOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('store_id', store.id)
    .neq('payment_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <>
      <div className="dash-header">
        <div className="dash-title">Notificações</div>
      </div>

      <OrderAlertsSettings storeId={store.id} />
      <AutoPrintSettings lastOrderId={lastOrder?.id ?? null} />
    </>
  )
}
