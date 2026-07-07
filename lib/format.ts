export function fmtCents(cents: number) {
  return 'R$ ' + (cents / 100).toFixed(2).replace('.', ',')
}

// Número curto do pedido (ex.: "Nº 12"). Cai no fim do UUID se ainda não numerado.
export function fmtOrderNumber(n: number | null | undefined, id?: string) {
  if (n != null) return `Nº ${n}`
  return id ? `#${id.slice(0, 8)}` : 'Nº —'
}

// Tempo relativo em português (ex.: "há 2 meses", "há 5 dias", "hoje").
export function fmtSince(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days <= 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 30) return `há ${days} dias`
  const months = Math.floor(days / 30)
  if (months < 12) return `há ${months} ${months === 1 ? 'mês' : 'meses'}`
  const years = Math.floor(days / 365)
  return `há ${years} ${years === 1 ? 'ano' : 'anos'}`
}

export const ORDER_TYPE_LABEL: Record<string, string> = {
  delivery: 'Entrega',
  pickup: 'Retirada',
  dine_in: 'Na mesa',
}

export const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Dinheiro',
  card: 'Cartão',
  pix: 'Pix',
}

export const PIX_KEY_TYPE_LABEL: Record<string, string> = {
  cpf_cnpj: 'CPF/CNPJ',
  email: 'E-mail',
  phone: 'Telefone',
  random: 'Chave aleatória',
}

export const STATUS_LABEL: Record<string, string> = {
  novo: 'Recebido',
  preparando: 'Em preparo',
  pronto: 'Pronto',
  a_caminho: 'A caminho',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}
