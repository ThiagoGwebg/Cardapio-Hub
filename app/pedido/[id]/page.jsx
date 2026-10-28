import OrderTracker from './OrderTracker'

// Acompanhamento de pedido é conteúdo privado e efêmero: fora do índice, e sem
// seguir links pra não gastar crawl budget com URLs que expiram.
export const metadata = {
  title: 'Acompanhar pedido',
  robots: { index: false, follow: false },
}

export default async function PedidoPage({ params }) {
  const { id } = await params
  return <OrderTracker orderId={id} />
}
