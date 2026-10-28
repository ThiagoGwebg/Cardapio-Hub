'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStore } from '@/lib/store'
import { friendlyOrderError } from '@/lib/format'
import { revalidatePath } from 'next/cache'

function nextStatus(current, orderType) {
  // Agendado pula direto pro preparo — "Iniciar preparo" quando chega a hora.
  if (current === 'agendado') return 'preparando'
  const flow =
    orderType === 'delivery'
      ? ['novo', 'preparando', 'pronto', 'a_caminho', 'concluido']
      : ['novo', 'preparando', 'pronto', 'concluido']
  const idx = flow.indexOf(current)
  if (idx === -1 || idx === flow.length - 1) return null
  return flow[idx + 1]
}

export async function advanceOrder(orderId, currentStatus, orderType) {
  const next = nextStatus(currentStatus, orderType)
  if (!next) return

  const supabase = await createClient()
  await supabase.from('orders').update({ status: next }).eq('id', orderId)
  revalidatePath('/dashboard/pedidos')
}

export async function cancelOrder(orderId) {
  const supabase = await createClient()
  await supabase.from('orders').update({ status: 'cancelado' }).eq('id', orderId)
  revalidatePath('/dashboard/pedidos')
}


// Registra um pedido feito presencialmente (balcão/mesa) via RPC create_manual_order.
// A loja vem da sessão — o cliente não escolhe o store_id.
export async function createManualOrder(payload) {
  const { supabase, store } = await getCurrentStore()

  const { error } = await supabase.rpc('create_manual_order', {
    p_store_id: store.id,
    p_payload: payload,
  })

  if (error) {
    if (error.message.includes('limite_pedidos_mes')) {
      return { error: 'Você atingiu o limite de 60 pedidos do mês no plano Lite. Assine o Pro para registrar pedidos ilimitados.' }
    }
    return { error: friendlyOrderError(error.message) }
  }

  revalidatePath('/dashboard/pedidos')
  revalidatePath('/dashboard/caixa')
  return {}
}
