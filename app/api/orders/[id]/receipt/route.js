import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  receiptEscPos,
  receiptText,
  RECEIPT_SELECT,
} from '@/lib/orders/receipt'
import { receiptHtml } from '@/lib/orders/receiptHtml'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Comanda de um pedido, nos três formatos que a impressão usa:
//   ?format=html   (padrão) → documento pronto pra impressora do navegador
//   ?format=escpos          → bytes ESC/POS em base64, pro RawBT no Android
//   ?format=text            → texto puro, usado na pré-visualização do painel
//
// Só o dono da loja lê: a sessão do painel identifica o usuário e o pedido é
// buscado com `store_id` fixado na loja dele (a RLS é a segunda barreira).
export async function GET(request, ctx) {
  const { id } = await ctx.params
  const { searchParams } = request.nextUrl

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Não autenticado', { status: 401 })

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, address, whatsapp_number')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!store) return new NextResponse('Loja não encontrada', { status: 404 })

  const { data: order } = await supabase
    .from('orders')
    .select(RECEIPT_SELECT)
    .eq('id', id)
    .eq('store_id', store.id)
    .maybeSingle()
  if (!order) return new NextResponse('Pedido não encontrado', { status: 404 })

  const width = searchParams.get('w') === '58' ? 58 : 80
  const copies = Math.min(5, Math.max(1, Number(searchParams.get('copies')) || 1))
  const opts = { width, copies }
  const format = searchParams.get('format') ?? 'html'

  // A comanda não pode ser guardada por proxy/CDN: ela é privada e muda de status.
  const headers = { 'Cache-Control': 'private, no-store' }

  if (format === 'escpos') {
    const base64 = Buffer.from(receiptEscPos(order, store, opts)).toString('base64')
    return new NextResponse(base64, { headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  if (format === 'text') {
    return new NextResponse(receiptText(order, store, opts), {
      headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const auto = searchParams.get('auto') === '1'
  return new NextResponse(receiptHtml(order, store, opts, auto), {
    headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
  })
}
