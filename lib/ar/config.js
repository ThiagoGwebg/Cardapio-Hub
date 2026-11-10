/**
 * Realidade aumentada (RA) — recurso exclusivo do plano Pro.
 *
 * O lojista envia até 4 fotos do prato (frente obrigatória; esquerda, trás e
 * direita opcionais) e a IA da Tripo3D devolve um modelo 3D (.glb). O modelo
 * só entra no cardápio depois que o lojista revisa e publica.
 *
 * Cada geração custa créditos na API, por isso a cota mensal. Geração que
 * FALHA na IA não consome a cota; descartar uma geração pronta, sim — o
 * crédito já foi gasto.
 */

/** Gerações de modelo 3D por loja Pro, por mês. */
export const AR_MONTHLY_LIMIT = Math.max(1, Number(process.env.AR_MONTHLY_LIMIT) || 10)

/** O recurso só liga com a chave da Tripo3D configurada no ambiente. */
export function arEnabled() {
  return !!process.env.TRIPO_API_KEY
}

/** Ordem fixa das vistas que a API multiview espera. */
export const AR_VIEWS = ['front', 'left', 'back', 'right']

export const AR_VIEW_LABEL = {
  front: 'Frente',
  left: 'Lado esquerdo',
  back: 'Trás',
  right: 'Lado direito',
}

/** Início do mês corrente, em ISO — base da contagem de cota. */
export function monthStartIso() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/**
 * Gerações que contam na cota do mês: tudo que não falhou. A geração em
 * andamento conta (impede disparar várias em paralelo) e a descartada também
 * (o crédito da API já foi consumido).
 */
export async function getArUsage(supabase, storeId) {
  const { count } = await supabase
    .from('ar_generations')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .neq('status', 'failed')
    .gte('created_at', monthStartIso())
  return { used: count ?? 0, limit: AR_MONTHLY_LIMIT }
}
