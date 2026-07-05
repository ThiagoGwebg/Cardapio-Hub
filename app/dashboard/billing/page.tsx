import { getCurrentStore } from '@/lib/store'
import { startCheckout, openBillingPortal } from './actions'

const ERROR_MESSAGES: Record<string, string> = {
  stripe_not_configured: 'Cobrança ainda não configurada (faltam as chaves do Stripe).',
  no_subscription: 'Nenhuma assinatura ativa ainda.',
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams
  const { supabase, store } = await getCurrentStore()

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end')
    .eq('store_id', store.id)
    .maybeSingle()

  const isPro = sub?.plan === 'pro' && sub.status === 'active'

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
          Assinatura confirmada!
        </p>
      )}

      <div className="settings-card">
        <div className="settings-section-title">Plano atual</div>
        <p style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Nunito, sans-serif', marginBottom: 6 }}>
          {isPro ? 'Pro' : 'Free'}
        </p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
          {isPro
            ? 'Produtos e pedidos ilimitados, cor e fonte personalizadas no cardápio.'
            : 'Até 20 produtos e 30 pedidos por mês. Logo e banner liberados; cor e fonte no Pro.'}
        </p>

        {isPro ? (
          <form action={openBillingPortal}>
            <button className="save-btn" type="submit">Gerenciar assinatura</button>
          </form>
        ) : (
          <form action={startCheckout}>
            <button className="save-btn" type="submit">Assinar Pro</button>
          </form>
        )}
      </div>
    </>
  )
}
