import type { Metadata } from 'next'
import OrderTracker from './OrderTracker'

// Acompanhamento de pedido é conteúdo privado e efêmero: fora do índice, e sem
// seguir links pra não gastar crawl budget com URLs que expiram.
export const metadata: Metadata = {
  title: 'Acompanhar pedido',
  robots: { index: false, follow: false },
}

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <OrderTracker orderId={id} />
}
