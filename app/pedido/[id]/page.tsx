import OrderTracker from './OrderTracker'

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <OrderTracker orderId={id} />
}
