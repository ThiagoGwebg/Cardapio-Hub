import { createAdminClient } from '@/lib/supabase/admin'
import { mpFetch } from '@/lib/mercadopago/client'
import { getBaseUrl } from '@/lib/baseUrl'
import { SP_TZ, fmtCents } from '@/lib/format'
import { notifyInvoice } from '@/lib/notify'
import { getBillingSettings } from '@/lib/billing/settings'

// Ciclo de cobrança da PLATAFORMA: gera a fatura mensal do lojista, cria o Pix na
// conta Mercado Pago da plataforma, e suspende o cardápio quando o atraso passa da carência.
//
// Todas as funções aqui usam o admin client (ignora RLS) — só chame de rota/action
// server-side de confiança (cron, webhook, ou action já autenticada).

export type PlanInvoice = {
  id: string
  store_id: string
  competence: string
  amount_cents: number
  due_date: string
  status: 'open' | 'paid' | 'overdue' | 'canceled'
  provider_payment_id: string | null
  qr_code: string | null
  qr_code_base64: string | null
  ticket_url: string | null
  expires_at: string | null
  paid_at: string | null
  notified_open_at?: string | null
  notified_overdue_at?: string | null
  notified_final_at?: string | null
}

export type BillingSubscription = {
  store_id: string
  plan: 'free' | 'pro'
  billing_enabled: boolean
  billing_status: 'current' | 'past_due' | 'suspended'
  price_cents: number
  next_due_date: string | null
  grace_days: number
  suspended_at: string | null
}

/** Token da conta MP DA PLATAFORMA (onde cai a mensalidade). Não é o token do lojista. */
export function getPlatformMpToken(): string | null {
  return process.env.MP_PLATFORM_ACCESS_TOKEN?.trim() || null
}

/** Hoje no fuso de São Paulo, como 'YYYY-MM-DD' (o servidor da Vercel roda em UTC).
 *  'en-CA' é o locale que formata data como YYYY-MM-DD, o mesmo formato da coluna `date`. */
export function todaySP(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: SP_TZ })
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function addMonths(isoDate: string, months: number): string {
  const [y, m, day] = isoDate.split('-').map(Number)
  // Dia 31 em mês curto cai no último dia do mês, nunca "vaza" pro mês seguinte.
  const target = new Date(Date.UTC(y, m - 1 + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return target.toISOString().slice(0, 10)
}

function monthStart(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`
}

/**
 * Garante que existe a fatura do ciclo corrente da loja. Emite com antecedência
 * (janela padrão de 7 dias antes do vencimento) para o lojista poder adiantar o Pix.
 * Idempotente: a unique (store_id, competence) impede fatura duplicada.
 */
export async function ensureInvoiceForStore(
  sub: BillingSubscription,
  emitDaysBefore = 7
): Promise<PlanInvoice | null> {
  if (!sub.billing_enabled || !sub.next_due_date) return null

  const today = todaySP()
  if (today < addDays(sub.next_due_date, -emitDaysBefore)) return null

  const admin = createAdminClient()
  const competence = monthStart(sub.next_due_date)

  const { data: existing } = await admin
    .from('plan_invoices')
    .select('*')
    .eq('store_id', sub.store_id)
    .eq('competence', competence)
    .maybeSingle<PlanInvoice>()

  if (existing) return existing

  const { data, error } = await admin
    .from('plan_invoices')
    .insert({
      store_id: sub.store_id,
      competence,
      amount_cents: sub.price_cents,
      due_date: sub.next_due_date,
      status: 'open',
    })
    .select('*')
    .maybeSingle<PlanInvoice>()

  // Corrida: outra execução criou a mesma competência entre o select e o insert.
  if (error) {
    const { data: raced } = await admin
      .from('plan_invoices')
      .select('*')
      .eq('store_id', sub.store_id)
      .eq('competence', competence)
      .maybeSingle<PlanInvoice>()
    return raced ?? null
  }

  return data ?? null
}

/**
 * Devolve o Pix da fatura, criando a cobrança na conta da plataforma se ainda não
 * houver uma válida. O QR é reaproveitado enquanto não expirar.
 */
export async function getOrCreateInvoicePix(
  invoiceId: string
): Promise<{ invoice: PlanInvoice } | { error: string }> {
  const token = getPlatformMpToken()
  if (!token) return { error: 'Pagamento da mensalidade ainda não configurado.' }

  const admin = createAdminClient()
  const { data: invoice } = await admin
    .from('plan_invoices')
    .select('*')
    .eq('id', invoiceId)
    .maybeSingle<PlanInvoice>()

  if (!invoice) return { error: 'Fatura não encontrada.' }
  if (invoice.status === 'paid') return { invoice }
  if (invoice.status === 'canceled') return { error: 'Fatura cancelada.' }

  const stillValid =
    invoice.qr_code && (!invoice.expires_at || new Date(invoice.expires_at).getTime() > Date.now())
  if (stillValid) return { invoice }

  // Pix da mensalidade vale 3 dias (o lojista costuma pagar fora do horário de expediente).
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  const amount = Number((invoice.amount_cents / 100).toFixed(2))

  type MpPayment = {
    id: number
    status: string
    point_of_interaction?: {
      transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string }
    }
  }

  let payment: MpPayment
  try {
    payment = await mpFetch<MpPayment>('/v1/payments', {
      accessToken: token,
      // Nova tentativa (Pix vencido) precisa de chave nova, senão o MP devolve a cobrança velha.
      idempotencyKey: `plan-invoice-${invoice.id}-${Date.now()}`,
      body: {
        transaction_amount: amount,
        description: `Cardápio Hub — mensalidade ${invoice.competence.slice(0, 7)}`,
        payment_method_id: 'pix',
        external_reference: `invoice:${invoice.id}`,
        notification_url: `${getBaseUrl()}/api/webhooks/mp-billing`,
        date_of_expiration: expiresAt.toISOString().replace('Z', '+00:00'),
        payer: { email: `loja-${invoice.store_id.slice(0, 8)}@billing.cardapiohub.app` },
      },
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Falha ao gerar o Pix da mensalidade.' }
  }

  const td = payment.point_of_interaction?.transaction_data
  const { data: updated, error: updErr } = await admin
    .from('plan_invoices')
    .update({
      provider_payment_id: String(payment.id),
      qr_code: td?.qr_code ?? null,
      qr_code_base64: td?.qr_code_base64 ?? null,
      ticket_url: td?.ticket_url ?? null,
      expires_at: expiresAt.toISOString(),
      raw: payment as unknown as Record<string, unknown>,
    })
    .eq('id', invoice.id)
    .select('*')
    .maybeSingle<PlanInvoice>()

  // Sem gravar o provider_payment_id o webhook não acha a fatura e o pagamento nunca baixa.
  if (updErr || !updated) return { error: 'Falha ao registrar a cobrança. Tente novamente.' }

  return { invoice: updated }
}

/**
 * Baixa a fatura e devolve a loja ao ar. Idempotente: só age em fatura ainda não paga.
 * Empurra o vencimento um mês à frente a partir do vencimento ANTERIOR (não da data do
 * pagamento), para que pagar atrasado não desloque o ciclo de cobrança.
 */
export async function markInvoicePaid(invoice: PlanInvoice): Promise<void> {
  const admin = createAdminClient()

  const { data: paidRow } = await admin
    .from('plan_invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', invoice.id)
    .neq('status', 'paid')
    .select('id')
    .maybeSingle()

  if (!paidRow) return // já estava paga: nada a fazer

  const { data: sub } = await admin
    .from('subscriptions')
    .select('next_due_date')
    .eq('store_id', invoice.store_id)
    .maybeSingle<{ next_due_date: string | null }>()

  const base = sub?.next_due_date && sub.next_due_date > invoice.due_date ? sub.next_due_date : invoice.due_date

  await admin
    .from('subscriptions')
    .update({
      billing_status: 'current',
      suspended_at: null,
      next_due_date: addMonths(base, 1),
    })
    .eq('store_id', invoice.store_id)
}

/** E-mail e nome da loja do dono — destinatário dos avisos de cobrança. */
async function getStoreContact(storeId: string): Promise<{ email: string; storeName: string } | null> {
  const admin = createAdminClient()
  const { data: store } = await admin
    .from('stores')
    .select('name, owner_id')
    .eq('id', storeId)
    .maybeSingle<{ name: string; owner_id: string }>()

  if (!store) return null
  const { data: user } = await admin.auth.admin.getUserById(store.owner_id)
  const email = user?.user?.email
  if (!email) return null
  return { email, storeName: store.name }
}

function fmtDueBR(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('pt-BR')
}

/**
 * Dispara UM aviso de fatura e grava a marca correspondente, para o cron diário
 * não reenviar o mesmo e-mail todo dia. A marca é gravada mesmo se o envio falhar
 * (best-effort): a alternativa seria repetir a tentativa diariamente para sempre.
 */
async function sendInvoiceNotice(
  invoice: PlanInvoice,
  kind: 'open' | 'overdue' | 'final',
  daysLeft?: number
): Promise<void> {
  const admin = createAdminClient()
  const column =
    kind === 'open' ? 'notified_open_at' : kind === 'overdue' ? 'notified_overdue_at' : 'notified_final_at'

  const contact = await getStoreContact(invoice.store_id)
  if (contact) {
    await notifyInvoice({
      to: contact.email,
      storeName: contact.storeName,
      amountLabel: fmtCents(invoice.amount_cents),
      dueLabel: fmtDueBR(invoice.due_date),
      kind,
      daysLeft,
    })
  }

  await admin
    .from('plan_invoices')
    .update({ [column]: new Date().toISOString() })
    .eq('id', invoice.id)
}

export type DelinquencyResult = {
  invoicesEmitted: number
  markedOverdue: number
  suspended: number
  notified: number
}

/**
 * Passo diário do ciclo: emite as faturas do período, marca as vencidas e suspende
 * quem passou da carência. Só toca em lojas com `billing_enabled` — loja legada ou
 * de cortesia nunca é suspensa por acidente.
 */
export async function runBillingCycle(): Promise<DelinquencyResult> {
  const admin = createAdminClient()
  const today = todaySP()

  const { emitDaysBefore } = await getBillingSettings()

  const { data: subs } = await admin
    .from('subscriptions')
    .select('store_id, plan, billing_enabled, billing_status, price_cents, next_due_date, grace_days, suspended_at')
    .eq('billing_enabled', true)
    .returns<BillingSubscription[]>()

  let invoicesEmitted = 0
  let notified = 0

  for (const sub of subs ?? []) {
    const invoice = await ensureInvoiceForStore(sub, emitDaysBefore)
    if (!invoice) continue
    if (invoice.status === 'open' && invoice.due_date === sub.next_due_date) invoicesEmitted++

    // Aviso 1: fatura disponível (só uma vez, quando ela é emitida).
    if (invoice.status === 'open' && !invoice.notified_open_at) {
      await sendInvoiceNotice(invoice, 'open')
      notified++
    }
  }

  // Vencida = passou do dia e não foi paga.
  const { data: overdue } = await admin
    .from('plan_invoices')
    .update({ status: 'overdue' })
    .eq('status', 'open')
    .lt('due_date', today)
    .select('*')
    .returns<PlanInvoice[]>()

  for (const inv of overdue ?? []) {
    await admin
      .from('subscriptions')
      .update({ billing_status: 'past_due' })
      .eq('store_id', inv.store_id)
      .eq('billing_status', 'current')

    // Aviso 2: venceu.
    if (!inv.notified_overdue_at) {
      await sendInvoiceNotice(inv, 'overdue')
      notified++
    }
  }

  // Suspende quem estourou a carência. A carência é por loja (grace_days).
  let suspended = 0
  const { data: pastDue } = await admin
    .from('subscriptions')
    .select('store_id, grace_days')
    .eq('billing_enabled', true)
    .eq('billing_status', 'past_due')
    .returns<{ store_id: string; grace_days: number }[]>()

  for (const sub of pastDue ?? []) {
    const { data: oldest } = await admin
      .from('plan_invoices')
      .select('*')
      .eq('store_id', sub.store_id)
      .eq('status', 'overdue')
      .order('due_date', { ascending: true })
      .limit(1)
      .maybeSingle<PlanInvoice>()

    if (!oldest) continue

    const cutoff = addDays(oldest.due_date, sub.grace_days)
    if (today > cutoff) {
      await admin
        .from('subscriptions')
        .update({ billing_status: 'suspended', suspended_at: new Date().toISOString() })
        .eq('store_id', sub.store_id)
        .eq('billing_status', 'past_due')
      suspended++
      continue
    }

    // Aviso 3: último alerta, 2 dias antes de sair do ar.
    if (!oldest.notified_final_at && today >= addDays(cutoff, -2)) {
      const daysLeft = Math.max(
        1,
        Math.round((new Date(`${cutoff}T12:00:00Z`).getTime() - new Date(`${today}T12:00:00Z`).getTime()) / 86400000)
      )
      await sendInvoiceNotice(oldest, 'final', daysLeft)
      notified++
    }
  }

  return { invoicesEmitted, markedOverdue: overdue?.length ?? 0, suspended, notified }
}
