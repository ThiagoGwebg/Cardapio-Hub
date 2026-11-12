import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, FileText } from 'lucide-react'
import { getCurrentStore } from '@/lib/store'
import { fmtCnpj, fmtMoney } from '@/lib/stock/format'
import InvoiceReview from '../../InvoiceReview'
import '../../estoque.css'

export const metadata = { title: 'Nota de entrada' }

const STATUS = {
  pendente: { label: 'Aguardando revisão', cls: 'is-warn' },
  lancada: { label: 'Lançada no estoque', cls: 'is-ok' },
  descartada: { label: 'Descartada', cls: '' },
}

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
})

export default async function InvoicePage({ params }) {
  const { id } = await params
  const { supabase, store } = await getCurrentStore()

  const [{ data: inv }, { data: lines }, { data: items }] = await Promise.all([
    supabase
      .from('purchase_invoices')
      .select('id, supplier_name, supplier_cnpj, access_key, number, series, issued_at, products_cents, total_cents, status, source, launched_at')
      .eq('id', id)
      .eq('store_id', store.id)
      .maybeSingle(),
    supabase
      .from('purchase_invoice_items')
      .select('id, line, code, ean, description, unit, quantity, unit_price_cents, total_cents, item_id, conversion, ignored, prev_cost_cents, cost_alert_ack')
      .eq('invoice_id', id)
      .eq('store_id', store.id)
      .order('line'),
    supabase
      .from('stock_items')
      .select('id, name, unit, quantity, avg_cost_cents, is_active')
      .eq('store_id', store.id)
      .order('name'),
  ])
  if (!inv) notFound()
  const st = STATUS[inv.status] ?? STATUS.pendente

  return (
    <>
      <Link href="/dashboard/estoque?tab=notas" className="stk-back">
        <ArrowLeft size={16} strokeWidth={2} aria-hidden /> Notas de compra
      </Link>

      <div className="dash-header page-head">
        <span className="page-head-ico" aria-hidden><FileText size={22} strokeWidth={2} /></span>
        <div>
          <h1 className="dash-title">
            {inv.number ? `Nota nº ${inv.number}${inv.series ? ` / ${inv.series}` : ''}` : 'Nota de entrada'}
          </h1>
          <div className="dash-subtitle">
            {inv.supplier_name}
            {inv.supplier_cnpj ? ` · ${fmtCnpj(inv.supplier_cnpj)}` : ''}
          </div>
        </div>
        <span className={`stk-chip ${st.cls} stk-head-chip`}>{st.label}</span>
      </div>

      <dl className="stk-facts">
        <div><dt>Emissão</dt><dd>{inv.issued_at ? dateFmt.format(new Date(inv.issued_at)) : '—'}</dd></div>
        <div><dt>Produtos</dt><dd>{fmtMoney(inv.products_cents)}</dd></div>
        <div><dt>Total da nota</dt><dd>{fmtMoney(inv.total_cents)}</dd></div>
        <div><dt>Origem</dt><dd>{inv.source === 'focus' ? 'Automático (Sefaz)' : 'Arquivo XML'}</dd></div>
        {inv.access_key && (
          <div className="is-wide"><dt>Chave de acesso</dt><dd className="stk-key">{inv.access_key.replace(/(\d{4})(?=\d)/g, '$1 ')}</dd></div>
        )}
      </dl>

      <InvoiceReview invoice={inv} lines={lines ?? []} items={(items ?? []).filter((i) => i.is_active || (lines ?? []).some((l) => l.item_id === i.id))} />
    </>
  )
}
