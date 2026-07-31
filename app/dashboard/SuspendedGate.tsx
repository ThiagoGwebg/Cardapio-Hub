import { AlertTriangle, Rocket } from 'lucide-react'
import { fmtCents } from '@/lib/format'
import InvoicePix from './billing/InvoicePix'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPixPayloadForPlan, renderPixQrDataUrl } from '@/lib/billing/pix'

/**
 * Tela única exibida no lugar de TODO o painel quando a mensalidade foi suspensa.
 * Fica no layout (e não numa página) porque um layout não conhece a rota atual —
 * assim não há caminho lateral para dentro do painel, e o lojista paga aqui mesmo.
 */
export default async function SuspendedGate({ storeId }: { storeId: string }) {
  const admin = createAdminClient()
  const { data: invoice } = await admin
    .from('plan_invoices')
    .select('amount_cents, due_date, status')
    .eq('store_id', storeId)
    .in('status', ['open', 'overdue', 'awaiting_confirmation'])
    .order('due_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan')
    .eq('store_id', storeId)
    .maybeSingle<{ plan: 'free' | 'pro' }>()

  // Loja que nunca pagou está na ATIVAÇÃO, não em atraso — o texto de cobrança
  // vencida assustaria um cliente novo que acabou de criar a conta.
  const { count: paidCount } = await admin
    .from('plan_invoices')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('status', 'paid')
  const firstPayment = (paidCount ?? 0) === 0

  const pixPayload = invoice ? await getPixPayloadForPlan(sub?.plan === 'pro' ? 'pro' : 'free') : null
  const qrDataUrl = pixPayload ? await renderPixQrDataUrl(pixPayload) : null

  return (
    <div style={{ maxWidth: 460, margin: '0 auto', padding: '48px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        {firstPayment ? (
          <Rocket size={40} strokeWidth={2} style={{ color: 'var(--accent, #FF5722)' }} />
        ) : (
          <AlertTriangle size={40} strokeWidth={2} style={{ color: 'var(--red)' }} />
        )}
        <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Nunito, sans-serif', margin: '12px 0 6px' }}>
          {firstPayment ? 'Ative seu cardápio' : 'Cardápio temporariamente fora do ar'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          {firstPayment
            ? 'Falta só o primeiro pagamento. Assim que ele for confirmado, seu cardápio entra no ar e o painel é liberado.'
            : 'A mensalidade está em atraso. Pague pelo Pix abaixo e tudo volta ao ar automaticamente, sem precisar avisar ninguém.'}
        </p>
      </div>

      {invoice ? (
        <InvoicePix
          amountLabel={fmtCents(invoice.amount_cents)}
          dueLabel={new Date(`${invoice.due_date}T12:00:00Z`).toLocaleDateString('pt-BR')}
          overdue={!firstPayment}
          firstPayment={firstPayment}
          planLabel={sub?.plan === 'pro' ? 'Pro' : 'Lite'}
          pixPayload={pixPayload}
          qrDataUrl={qrDataUrl}
          awaitingConfirmation={invoice.status === 'awaiting_confirmation'}
          // Loja já fora do ar: esconder o QR atrás de um clique só atrapalharia.
          startOpen
        />
      ) : (
        <div className="settings-card">
          <p style={{ fontSize: 13, margin: 0 }}>
            Não encontramos a fatura em aberto. Fale com a gente pelo WhatsApp para reativar.
          </p>
        </div>
      )}
    </div>
  )
}
