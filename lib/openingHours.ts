import { SP_TZ } from '@/lib/format'

/**
 * Fonte única de verdade do horário de funcionamento da loja.
 *
 * Os dados moram em `stores.opening_hours` (JSONB) + `stores.auto_hours` (bool),
 * colunas que já existiam no banco e que a view `store_public` expõe — então o
 * cardápio público recebe tudo sem nenhuma query extra.
 *
 * Formato salvo:
 *   { "mon": [{ "open": "18:00", "close": "23:30" }], "tue": [], ... }
 * Dia sem faixa = fechado. Faixa com `close <= open` cruza a meia-noite
 * (ex.: 18:00 → 01:00), caso comum de pizzaria e que precisa continuar aberta
 * depois das 00:00.
 */

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type DayKey = (typeof DAY_KEYS)[number]

export const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Segunda',
  tue: 'Terça',
  wed: 'Quarta',
  thu: 'Quinta',
  fri: 'Sexta',
  sat: 'Sábado',
  sun: 'Domingo',
}

export type TimeRange = { open: string; close: string }
export type OpeningHours = Record<DayKey, TimeRange[]>

/** Máximo de faixas por dia — segura o JSON e a UI num tamanho sensato. */
export const MAX_RANGES_PER_DAY = 3

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

/** Grade vazia (todos os dias fechados) — usada como base e como fallback. */
export function emptyOpeningHours(): OpeningHours {
  return { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }
}

/** "HH:MM" → minutos desde a meia-noite. -1 quando o formato é inválido. */
export function timeToMinutes(value: string): number {
  const m = TIME_RE.exec(value)
  if (!m) return -1
  return Number(m[1]) * 60 + Number(m[2])
}

/** Minutos desde a meia-noite → "HH:MM". */
export function minutesToTime(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/**
 * Normaliza o que veio do banco ou do formulário. Mesmo espírito de
 * `sanitizeHexColor` em lib/storeTheme.ts: nunca confia na entrada, sempre
 * devolve uma estrutura íntegra. Descarta horário fora de "HH:MM", faixa de
 * duração zero e o excedente de `MAX_RANGES_PER_DAY`.
 */
export function sanitizeOpeningHours(value: unknown): OpeningHours {
  const out = emptyOpeningHours()
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out

  const raw = value as Record<string, unknown>
  for (const day of DAY_KEYS) {
    const list = raw[day]
    if (!Array.isArray(list)) continue

    const ranges: TimeRange[] = []
    for (const entry of list) {
      if (!entry || typeof entry !== 'object') continue
      const open = String((entry as Record<string, unknown>).open ?? '')
      const close = String((entry as Record<string, unknown>).close ?? '')
      const openMin = timeToMinutes(open)
      const closeMin = timeToMinutes(close)
      // Faixa de duração zero (abre e fecha no mesmo minuto) é ruído: ignorada.
      if (openMin < 0 || closeMin < 0 || openMin === closeMin) continue
      ranges.push({ open, close })
      if (ranges.length >= MAX_RANGES_PER_DAY) break
    }

    out[day] = ranges.sort((a, b) => timeToMinutes(a.open) - timeToMinutes(b.open))
  }

  return out
}

/** True quando nenhum dia tem faixa — grade nunca configurada. */
export function isOpeningHoursEmpty(hours: OpeningHours): boolean {
  return DAY_KEYS.every((d) => hours[d].length === 0)
}

/**
 * Momento atual no fuso da loja (América/São Paulo), independente do fuso do
 * aparelho do cliente — quem está viajando não pode ver a loja "aberta" por
 * causa do relógio do celular.
 */
export function spNowParts(now: Date): { dayIndex: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SP_TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  // en-US devolve "Mon", "Tue"… — alinhado com DAY_KEYS (segunda = 0).
  const dayIndex = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday'))
  // Meia-noite sai como "24" em algumas engines com hour12:false.
  const hour = Number(get('hour')) % 24
  const minutes = hour * 60 + Number(get('minute'))

  return { dayIndex: dayIndex < 0 ? 0 : dayIndex, minutes }
}

function dayAt(index: number): DayKey {
  return DAY_KEYS[((index % 7) + 7) % 7]
}

/**
 * A loja está dentro de alguma faixa agora?
 *
 * Checa o dia atual e também o anterior — uma faixa que vira a madrugada
 * (18:00 → 01:00 de sábado) ainda está valendo às 00:30 de domingo.
 */
export function isOpenBySchedule(hours: OpeningHours, now: Date): boolean {
  const { dayIndex, minutes } = spNowParts(now)

  for (const r of hours[dayAt(dayIndex)]) {
    const open = timeToMinutes(r.open)
    const close = timeToMinutes(r.close)
    if (close > open ? minutes >= open && minutes < close : minutes >= open) return true
  }

  for (const r of hours[dayAt(dayIndex - 1)]) {
    const open = timeToMinutes(r.open)
    const close = timeToMinutes(r.close)
    // Só faixas que atravessam a meia-noite continuam valendo no dia seguinte.
    if (close <= open && minutes < close) return true
  }

  return false
}

/**
 * Próxima abertura a partir de agora, varrendo até 7 dias à frente.
 * Devolve null quando a grade está vazia (loja sem horário cadastrado).
 */
export function nextOpening(hours: OpeningHours, now: Date): { dayKey: DayKey; time: string; daysAhead: number } | null {
  const { dayIndex, minutes } = spNowParts(now)

  for (let ahead = 0; ahead < 8; ahead++) {
    const key = dayAt(dayIndex + ahead)
    for (const r of hours[key]) {
      const open = timeToMinutes(r.open)
      if (ahead > 0 || open > minutes) return { dayKey: key, time: r.open, daysAhead: ahead }
    }
  }

  return null
}

/** "hoje às 18:00" / "amanhã às 18:00" / "sábado às 11:00". */
export function formatNextOpening(next: { dayKey: DayKey; time: string; daysAhead: number }): string {
  if (next.daysAhead === 0) return `hoje às ${next.time}`
  if (next.daysAhead === 1) return `amanhã às ${next.time}`
  return `${DAY_LABELS[next.dayKey].toLowerCase()} às ${next.time}`
}

export type StoreOpenState = {
  open: boolean
  /** 'manual' = lojista pausou; 'schedule' = fora do horário; 'open' = aberta. */
  reason: 'manual' | 'schedule' | 'open'
  /** Só quando fechada por horário e existe próxima abertura conhecida. */
  nextLabel?: string
}

type StoreHoursInput = {
  is_open: boolean
  auto_hours?: boolean | null
  opening_hours?: unknown
}

/**
 * Estado final da loja para o cardápio público.
 *
 * Precedências, nesta ordem:
 *  1. `is_open = false` fecha sempre — é o interruptor manual do lojista
 *     (o "botão de pânico"), e ele vence qualquer grade.
 *  2. `auto_hours = false` → comportamento idêntico ao de antes desta feature,
 *     ou seja, lojas que nunca configuraram grade não mudam de comportamento.
 *  3. Grade vazia com auto_hours ligado é tratada como "sem restrição" em vez de
 *     "fechada pra sempre" — evita derrubar a loja por configuração incompleta.
 */
export function resolveStoreOpen(store: StoreHoursInput, now: Date): StoreOpenState {
  if (!store.is_open) return { open: false, reason: 'manual' }
  if (!store.auto_hours) return { open: true, reason: 'open' }

  const hours = sanitizeOpeningHours(store.opening_hours)
  if (isOpeningHoursEmpty(hours)) return { open: true, reason: 'open' }
  if (isOpenBySchedule(hours, now)) return { open: true, reason: 'open' }

  const next = nextOpening(hours, now)
  return { open: false, reason: 'schedule', nextLabel: next ? formatNextOpening(next) : undefined }
}
