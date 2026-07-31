import Link from 'next/link'
import { AlertTriangle, CircleDollarSign } from 'lucide-react'
import { fmtCents } from '@/lib/format'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Faixa de aviso no topo do painel quando há mensalidade em aberto.
 * Fica no layout para o lojista ver de qualquer tela — não só na de assinatura.
 * Loja já suspensa não passa por aqui (o layout troca o painel inteiro pelo SuspendedGate).
 */
export default async function BillingBanner({ storeId }: { storeId: string }) {
  const admin = createAdminClient()
  const { data: invoice } = await admin
    .from('plan_invoices')
    .select('amount_cents, due_date, status')
    .eq('store_id', storeId)
    .in('status', ['open', 'overdue'])
    .order('due_date', { ascending: true })
    .limit(1)
    .maybeSingle<{ amount_cents: number; due_date: string; status: string }>()

  if (!invoice) return null

  const overdue = invoice.status === 'overdue'
  const dueLabel = new Date(`${invoice.due_date}T12:00:00Z`).toLocaleDateString('pt-BR')

  return (
    <Link
      href="/dashboard/billing"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        margin: '0 0 14px',
        borderRadius: 10,
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: 600,
        background: overdue ? 'rgba(220,38,38,.12)' : 'rgba(255,87,34,.10)',
        color: overdue ? 'var(--red)' : 'var(--accent, #FF5722)',
        border: `1px solid ${overdue ? 'rgba(220,38,38,.3)' : 'rgba(255,87,34,.25)'}`,
      }}
    >
      {overdue ? <AlertTriangle size={16} strokeWidth={2.3} /> : <CircleDollarSign size={16} strokeWidth={2.3} />}
      <span>
        {overdue
          ? `Mensalidade de ${fmtCents(invoice.amount_cents)} venceu em ${dueLabel} — pague para manter o cardápio no ar`
          : `Mensalidade de ${fmtCents(invoice.amount_cents)} vence em ${dueLabel}`}
      </span>
      <span style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>Pagar com Pix →</span>
    </Link>
  )
}
