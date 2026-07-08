export function fmtCents(cents: number) {
  return 'R$ ' + (cents / 100).toFixed(2).replace('.', ',')
}

// ── Datas no fuso do negócio (São Paulo) ──────────────────────────
// O servidor roda em UTC (Vercel) mas a loja pensa em horário de Brasília.
// Estas helpers ancoram os limites de mês/dia no fuso de SP para que os
// números do painel não pulem de um dia pro outro conforme o fuso do host.
export const SP_TZ = 'America/Sao_Paulo'

function spWall(instant: Date) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: SP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const m = {} as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>
  for (const p of dtf.formatToParts(instant)) {
    if (p.type !== 'literal') m[p.type as keyof typeof m] = Number(p.value)
  }
  return m
}

// Diferença entre a hora de parede de SP e o UTC, em ms (para SP hoje: -3h fixo,
// já que o Brasil não tem mais horário de verão). Derivado, não hardcoded.
function spOffsetMs(instant: Date) {
  const w = spWall(instant)
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - instant.getTime()
}

/** Instante (UTC) da meia-noite de São Paulo no 1º dia do mês, deslocado por `monthDelta`. */
export function spMonthStart(now: Date, monthDelta = 0): Date {
  const off = spOffsetMs(now)
  const w = spWall(now)
  return new Date(Date.UTC(w.year, w.month - 1 + monthDelta, 1, 0, 0, 0) - off)
}

/** Chave "dd/mm" do dia de calendário em São Paulo — para agrupar por dia. */
export function spDayKey(instant: Date): string {
  return instant.toLocaleDateString('pt-BR', { timeZone: SP_TZ, day: '2-digit', month: '2-digit' })
}

/** Instante (UTC) da meia-noite de São Paulo do dia de hoje, deslocado por `dayDelta`. */
export function spDayStart(now: Date, dayDelta = 0): Date {
  const off = spOffsetMs(now)
  const w = spWall(now)
  return new Date(Date.UTC(w.year, w.month - 1, w.day + dayDelta, 0, 0, 0) - off)
}

/** Hora do dia (0–23) em São Paulo — para histogramas de horário de pico. */
export function spHour(instant: Date): number {
  return spWall(instant).hour
}

/** Rótulo curto do dia da semana em São Paulo (ex.: "Seg", "Ter"). */
export function spWeekdayShort(instant: Date): string {
  const s = instant.toLocaleDateString('pt-BR', { timeZone: SP_TZ, weekday: 'short' }).replace('.', '')
  return s.charAt(0).toUpperCase() + s.slice(1)
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
