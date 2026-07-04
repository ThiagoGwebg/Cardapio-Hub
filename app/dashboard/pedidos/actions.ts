'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const NEXT_STATUS: Record<string, string | null> = {
  novo: 'preparando',
  preparando: 'pronto',
  pronto: 'concluido',
  concluido: null,
}

export async function advanceOrder(orderId: string, currentStatus: string) {
  const next = NEXT_STATUS[currentStatus]
  if (!next) return

  const supabase = await createClient()
  await supabase.from('orders').update({ status: next }).eq('id', orderId)
  revalidatePath('/dashboard/pedidos')
}
