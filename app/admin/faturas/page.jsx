import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import InvoicesBoard, { } from './InvoicesBoard'
import PixSettings from './PixSettings'
import { getAllPixPayloads, readPixAmountCents } from '@/lib/billing/pix'
import { DEFAULT_PLAN_PRICE_CENTS } from '@/lib/billing/plans'
import { getBillingSettings } from '@/lib/billing/settings'

export const metadata = {
  title: 'Faturas — Admin Cardápio Hub',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'


export default async function AdminInvoicesPage() {
  await requireAdmin()
  const supabase = createAdminClient()

  const [invoicesRes, storesRes, pixPayloads, billingSettings] = await Promise.all([
    supabase
      .from('plan_invoices')
      .select('id, store_id, amount_cents, due_date, status, paid_at, payment_claimed_at')
      .order('due_date', { ascending: false })
      .limit(500),
    supabase.from('stores').select('id, name, slug, billing_suspended'),
    getAllPixPayloads(),
    getBillingSettings(),
  ])

  // Valor embutido em cada QR já cadastrado. Conferido AQUI, na carga da página, e
  // não só na hora de salvar: um payload gravado antes de um reajuste continuaria
  // exibindo "✓" pra sempre, e o lojista pagaria o preço velho sem ninguém notar.
  const storedAmounts = Object.fromEntries(
    (Object.keys(DEFAULT_PLAN_PRICE_CENTS)).map((plan) => {
      const payload = pixPayloads[plan]
      return [plan, payload ? readPixAmountCents(payload) : null]
    }),
  );

  const storeById = new Map()
  for (const s of (storesRes.data || [])) {
    storeById.set(s.id, { name: s.name, slug: s.slug, suspended: !!s.billing_suspended })
  }

  const invoices = ((invoicesRes.data || [])).map((inv) => {
    const store = storeById.get(inv.store_id)
    return {
      id: inv.id,
      storeName: store?.name ?? '(loja removida)',
      storeSlug: store?.slug ?? '',
      amountCents: inv.amount_cents,
      dueDate: inv.due_date,
      status: inv.status,
      paidAt: inv.paid_at,
      claimedAt: inv.payment_claimed_at,
      suspended: store?.suspended ?? false,
    }
  })

  return (
    <main className="adm-page">
      <h1 className="adm-title">Faturas</h1>
      <p className="adm-subtitle">
        Mensalidades dos lojistas. O lojista paga no seu QR e avisa; você confere no extrato
        e confirma aqui.
      </p>

      <PixSettings
        initial={pixPayloads}
        expected={DEFAULT_PLAN_PRICE_CENTS}
        stored={storedAmounts}
        emitDaysBefore={billingSettings.emitDaysBefore}
      />
      <InvoicesBoard invoices={invoices} />
    </main>
  )
}
