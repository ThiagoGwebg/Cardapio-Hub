import Link from 'next/link'
import { getCurrentStore } from '@/lib/store'
import { getStoreUsage } from '@/lib/plan'
import { LITE_PRICE_LABEL } from '@/lib/stripe/plans'
import { UsageMeter } from '@/components/dashboard/ProUpsell'
import { openBillingPortal } from './actions'
import SubmitButton from '@/components/ui/SubmitButton'

const ERROR_MESSAGES: Record<string, string> = {
  stripe_not_configured: 'Cobrança ainda não configurada (faltam as chaves do Stripe).',
  no_subscription: 'Nenhuma assinatura ativa ainda.',
}

const FEATURES: { label: string; free: string; pro: string }[] = [
  { label: 'Produtos no cardápio', free: 'Até 30', pro: 'Ilimitados' },
  { label: 'Pedidos por mês', free: 'Até 60', pro: 'Ilimitados' },
  { label: 'Logo e banner personalizados', free: '✓', pro: '✓' },
  { label: 'Cor e fonte do cardápio', free: '—', pro: '✓' },
  { label: 'Aviso promocional no cardápio', free: '—', pro: '✓' },
  { label: 'Selo "Feito com Cardápio Hub"', free: 'Com selo', pro: 'Sem selo' },
  { label: 'Clientes fiéis (CRM + WhatsApp)', free: '—', pro: '✓' },
  { label: 'Notificações de pedido por WhatsApp', free: '—', pro: '✓' },
  { label: 'QR Code para imprimir', free: '—', pro: '✓' },
  { label: 'Desempenho de 30 e 90 dias', free: '—', pro: '✓' },
  { label: 'Relatórios avançados', free: '—', pro: '✓' },
  { label: 'Top produtos mais vendidos', free: '—', pro: '✓' },
  { label: 'Horários de pico', free: '—', pro: '✓' },
  { label: 'Canais e formas de pagamento', free: '—', pro: '✓' },
  { label: 'Exportar caixa em CSV', free: '—', pro: '✓' },
  { label: 'Vários usuários e lojas', free: '—', pro: '✓' },
  { label: 'Suporte prioritário', free: 'Padrão', pro: 'Prioritário' },
  { label: 'Comissão por venda', free: 'R$ 0', pro: 'R$ 0' },
]

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams
  const { supabase, store } = await getCurrentStore()

  const usage = await getStoreUsage(supabase, store.id)
  const isPro = usage.isPro

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('current_period_end')
    .eq('store_id', store.id)
    .maybeSingle()

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
        <p style={{ color: 'var(--green)', fontSize: 12, marginBottom: 12 }}>
          Assinatura confirmada! Bem-vindo ao Pro 🎉
        </p>
      )}

      <div className="settings-card">
        <div className="settings-section-title">Plano atual</div>
        <p style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Nunito, sans-serif', marginBottom: 6 }}>
          {isPro ? <>Pro <span className="pro-badge">ativo</span></> : <>Lite <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>· {LITE_PRICE_LABEL}/mês</span></>}
        </p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
          {isPro
            ? `Tudo liberado, sem limites.${sub?.current_period_end ? ` Renova em ${new Date(sub.current_period_end).toLocaleDateString('pt-BR')}.` : ''}`
            : 'Você está no plano Lite. Veja abaixo o que o Pro destrava.'}
        </p>

        {!isPro && (
          <>
            <UsageMeter label="Produtos cadastrados" used={usage.productCount} limit={usage.maxProducts} />
            <UsageMeter label="Pedidos neste mês" used={usage.ordersThisMonth} limit={usage.maxOrdersPerMonth} />
          </>
        )}

        {isPro ? (
          <form action={openBillingPortal}>
            <SubmitButton className="save-btn" pendingLabel="Abrindo…">Gerenciar assinatura</SubmitButton>
          </form>
        ) : (
          <Link href="/contato" className="save-btn" style={{ marginTop: 12, display: 'inline-block' }}>
            Quero fazer upgrade pro Pro
          </Link>
        )}
      </div>

      <div className="settings-card">
        <div className="settings-section-title">Lite × Pro</div>
        <table className="plan-table">
          <thead>
            <tr>
              <th></th>
              <th>Lite</th>
              <th className="plan-table-pro">Pro</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f) => (
              <tr key={f.label}>
                <td>{f.label}</td>
                <td className={f.free === '—' ? 'plan-cell-off' : ''}>{f.free}</td>
                <td className="plan-table-pro">{f.pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isPro && (
          <Link href="/contato" className="save-btn" style={{ marginTop: 16, display: 'inline-block' }}>
            Quero o Pro — falar com a gente
          </Link>
        )}
        <p style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 10 }}>
          {isPro
            ? 'Sem fidelidade: cancele quando quiser, direto pelo painel.'
            : 'O Pro é sob medida pro seu segmento — a gente te mostra o valor exato e ativa pra você. Sem fidelidade.'}
        </p>
      </div>
    </>
  )
}
