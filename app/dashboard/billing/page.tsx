import { Check, Clock, Minus, PartyPopper } from 'lucide-react'
import Link from 'next/link'
import { getCurrentStore } from '@/lib/store'
import { getStoreUsage } from '@/lib/plan'
import { DEFAULT_PLAN_PRICE_CENTS, planLabel, type BillingPlan } from '@/lib/billing/plans'
import { UsageMeter } from '@/components/dashboard/ProUpsell'
import { openBillingPortal } from './actions'
import SubmitButton from '@/components/ui/SubmitButton'
import { fmtCents } from '@/lib/format'
import InvoicePix from './InvoicePix'
import { getPixPayloadForPlan, renderPixQrDataUrl } from '@/lib/billing/pix'

const ERROR_MESSAGES: Record<string, string> = {
  stripe_not_configured: 'Cobrança ainda não configurada (faltam as chaves do Stripe).',
  no_subscription: 'Nenhuma assinatura ativa ainda.',
}

// Uma linha por recurso, com o valor em cada plano. O que estiver aqui precisa
// bater com PLAN_LIMITS e com os gates reais — esta tabela é o que o lojista lê
// antes de pagar, então "✓" aqui é promessa de contrato.
const FEATURES: { label: string; free: string; plus: string; pro: string }[] = [
  { label: 'Produtos no cardápio', free: 'Até 30', plus: 'Ilimitados', pro: 'Ilimitados' },
  { label: 'Pedidos por mês', free: 'Até 60', plus: 'Até 300', pro: 'Ilimitados' },
  { label: 'Logo e banner personalizados', free: '✓', plus: '✓', pro: '✓' },
  { label: 'QR Code para imprimir', free: '—', plus: '✓', pro: '✓' },
  { label: 'Cor e fonte do cardápio', free: '—', plus: '—', pro: '✓' },
  { label: 'Aviso promocional no cardápio', free: '—', plus: '—', pro: '✓' },
  { label: 'Selo "Feito com Cardápio Hub"', free: 'Com selo', plus: 'Com selo', pro: 'Sem selo' },
  { label: 'Clientes fiéis (CRM + WhatsApp)', free: '—', plus: '—', pro: '✓' },
  { label: 'Notificações de pedido por WhatsApp', free: '—', plus: '—', pro: '✓' },
  { label: 'Desempenho de 30 e 90 dias', free: '—', plus: '—', pro: '✓' },
  { label: 'Relatórios avançados', free: '—', plus: '—', pro: '✓' },
  { label: 'Top produtos mais vendidos', free: '—', plus: '—', pro: '✓' },
  { label: 'Horários de pico', free: '—', plus: '—', pro: '✓' },
  { label: 'Canais e formas de pagamento', free: '—', plus: '—', pro: '✓' },
  { label: 'Exportar caixa em CSV', free: '—', plus: '—', pro: '✓' },
  { label: 'Vários usuários e lojas', free: '—', plus: '—', pro: '✓' },
  { label: 'Suporte prioritário', free: 'Padrão', plus: 'Padrão', pro: 'Prioritário' },
  { label: 'Comissão por venda', free: 'R$ 0', plus: 'R$ 0', pro: 'R$ 0' },
]

/** Colunas da tabela, na ordem de preço. */
const COLUMNS: { key: BillingPlan; label: string }[] = [
  { key: 'free', label: 'Lite' },
  { key: 'plus', label: 'Plus' },
  { key: 'pro', label: 'Pro' },
]

/**
 * Célula da tabela de planos: os marcadores "✓" e "—" viram ícone; qualquer
 * outro valor ("Até 30", "Ilimitados") continua sendo texto.
 */
function renderCell(value: string) {
  if (value === '✓') return <Check size={16} strokeWidth={2.6} className="plan-cell-icon" aria-label="incluído" />
  if (value === '—') return <Minus size={16} strokeWidth={2.4} className="plan-cell-icon" aria-label="não incluído" />
  return value
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams
  const { supabase, store } = await getCurrentStore()

  const usage = await getStoreUsage(supabase, store.id)
  const plan = usage.plan
  const isPro = plan === 'pro'
  // Quem já está no topo não vê upsell; Lite e Plus veem.
  const canUpgrade = plan !== 'pro'

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('current_period_end, stripe_customer_id, billing_enabled, billing_status, price_cents, next_due_date')
    .eq('store_id', store.id)
    .maybeSingle()

  // Fatura da mensalidade em aberto (o lojista pagando a plataforma).
  const { data: invoice } = await supabase
    .from('plan_invoices')
    .select('amount_cents, due_date, status')
    .eq('store_id', store.id)
    .in('status', ['open', 'overdue', 'awaiting_confirmation'])
    .order('due_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  const suspended = sub?.billing_status === 'suspended'

  // Pedido de upgrade já aberto: o CTA vira status, senão o lojista pede duas vezes.
  const { data: upgradeRequest } = isPro
    ? { data: null }
    : await supabase
        .from('plan_upgrade_requests')
        .select('created_at')
        .eq('store_id', store.id)
        .eq('status', 'pending')
        .limit(1)
        .maybeSingle<{ created_at: string }>()

  // QR Pix estático da plataforma, por plano. Renderizado no servidor.
  const pixPayload = invoice ? await getPixPayloadForPlan(plan) : null
  const qrDataUrl = pixPayload ? await renderPixQrDataUrl(pixPayload) : null

  return (
    <>
      <div className="dash-header">
        <div className="dash-title">Assinatura</div>
      </div>

      {error && (
        <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>
          {ERROR_MESSAGES[error] ?? 'Ocorreu um erro.'}
        </p>
      )}
      {success && (
        <p style={{ color: 'var(--green)', fontSize: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <PartyPopper size={14} strokeWidth={2.2} />
          Assinatura confirmada! Bem-vindo ao Pro
        </p>
      )}

      {suspended && (
        <div
          className="settings-card"
          style={{ borderLeft: '4px solid var(--red)', marginBottom: 16 }}
        >
          <div className="settings-section-title" style={{ color: 'var(--red)' }}>
            Cardápio fora do ar
          </div>
          <p style={{ fontSize: 13, marginBottom: 0 }}>
            Seu cardápio está indisponível para os clientes por causa da mensalidade em atraso.
            Assim que o pagamento cair, ele volta ao ar automaticamente.
          </p>
        </div>
      )}

      {invoice && (
        <InvoicePix
          amountLabel={fmtCents(invoice.amount_cents)}
          dueLabel={new Date(`${invoice.due_date}T12:00:00Z`).toLocaleDateString('pt-BR')}
          overdue={invoice.status === 'overdue'}
          planLabel={planLabel(plan)}
          pixPayload={pixPayload}
          qrDataUrl={qrDataUrl}
          awaitingConfirmation={invoice.status === 'awaiting_confirmation'}
        />
      )}

      <div className="settings-card">
        <div className="settings-section-title">Plano atual</div>
        <p style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Nunito, sans-serif', marginBottom: 6 }}>
          {planLabel(plan)}{' '}
          {isPro ? (
            <span className="pro-badge">ativo</span>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
              · {fmtCents(DEFAULT_PLAN_PRICE_CENTS[plan])}/mês
            </span>
          )}
        </p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
          {isPro
            ? `Tudo liberado, sem limites.${sub?.current_period_end ? ` Renova em ${new Date(sub.current_period_end).toLocaleDateString('pt-BR')}.` : ''}`
            : `Você está no plano ${planLabel(plan)}. Veja abaixo o que os outros planos destravam.`}
        </p>

        {canUpgrade && (
          <>
            <UsageMeter label="Produtos cadastrados" used={usage.productCount} limit={usage.maxProducts} />
            <UsageMeter label="Pedidos neste mês" used={usage.ordersThisMonth} limit={usage.maxOrdersPerMonth} />
          </>
        )}

        {sub?.next_due_date && sub.billing_enabled && (
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
            Próximo vencimento: {new Date(`${sub.next_due_date}T12:00:00Z`).toLocaleDateString('pt-BR')}
            {sub.price_cents ? ` · ${fmtCents(sub.price_cents)}/mês` : ''}
          </p>
        )}

        {/* O portal do Stripe só existe para quem tem assinatura de cartão de verdade. */}
        {sub?.stripe_customer_id ? (
          <form action={openBillingPortal}>
            <SubmitButton className="save-btn" pendingLabel="Abrindo…">Gerenciar assinatura</SubmitButton>
          </form>
        ) : !canUpgrade ? null : upgradeRequest ? (
          <p style={{ fontSize: 12, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 0 }}>
            <Clock size={14} strokeWidth={2.2} />
            Pedido de upgrade enviado em {new Date(upgradeRequest.created_at).toLocaleDateString('pt-BR')} — nosso
            time entra em contato em até 1 dia útil.
          </p>
        ) : (
          <Link href="/dashboard/billing/upgrade" className="save-btn" style={{ marginTop: 12, display: 'inline-block' }}>
            {plan === 'free' ? 'Quero fazer upgrade' : 'Quero fazer upgrade pro Pro'}
          </Link>
        )}
      </div>

      <div className="settings-card">
        <div className="settings-section-title">Compare os planos</div>
        <div className="plan-table-scroll">
        <table className="plan-table">
          <thead>
            <tr>
              <th></th>
              {COLUMNS.map((c) => (
                <th key={c.key} className={c.key === 'pro' ? 'plan-table-pro' : ''}>
                  {c.label}
                  <span className="plan-table-price">{fmtCents(DEFAULT_PLAN_PRICE_CENTS[c.key])}/mês</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f) => (
              <tr key={f.label}>
                <td>{f.label}</td>
                {COLUMNS.map((c) => (
                  <td
                    key={c.key}
                    className={[c.key === 'pro' ? 'plan-table-pro' : '', f[c.key] === '—' ? 'plan-cell-off' : '']
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {renderCell(f[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {canUpgrade && !upgradeRequest && (
          <Link href="/dashboard/billing/upgrade" className="save-btn" style={{ marginTop: 16, display: 'inline-block' }}>
            Quero mudar de plano — falar com a gente
          </Link>
        )}
        <p style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 10 }}>
          {isPro
            ? 'Sem fidelidade: cancele quando quiser, direto pelo painel.'
            : 'A gente ativa o plano novo pra você e ajusta a próxima fatura. Sem fidelidade: cancele quando quiser.'}
        </p>
      </div>
    </>
  )
}
