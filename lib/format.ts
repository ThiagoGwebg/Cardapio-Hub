export function fmtCents(cents: number) {
  return 'R$ ' + (cents / 100).toFixed(2).replace('.', ',')
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
