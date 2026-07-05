'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function nextStatus(current: string, orderType: string): string | null {
  const flow =
    orderType === 'delivery'
      ? ['novo', 'preparando', 'pronto', 'a_caminho', 'concluido']
      : ['novo', 'preparando', 'pronto', 'concluido']
  const idx = flow.indexOf(current)
  if (idx === -1 || idx === flow.length - 1) return null
  return flow[idx + 1]
}

export async function advanceOrder(orderId: string, currentStatus: string, orderType: string) {
  const next = nextStatus(currentStatus, orderType)
  if (!next) return

  const supabase = await createClient()
  await supabase.from('orders').update({ status: next }).eq('id', orderId)
  revalidatePath('/dashboard/pedidos')
}

export async function cancelOrder(orderId: string) {
  const supabase = await createClient()
  await supabase.from('orders').update({ status: 'cancelado' }).eq('id', orderId)
  revalidatePath('/dashboard/pedidos')
}
