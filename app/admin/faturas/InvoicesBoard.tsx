'use client'

import { useMemo, useState, useTransition } from 'react'
import { Check, Ban, Search, X } from 'lucide-react'
import { fmtCents } from '@/lib/format'
import { markInvoicePaidManually, cancelInvoice, rejectPaymentClaim } from './actions'

export type AdminInvoice = {
  id: string
  storeName: string
  storeSlug: string
  amountCents: number
  dueDate: string
  status: 'open' | 'awaiting_confirmation' | 'paid' | 'overdue' | 'canceled'
  paidAt: string | null
  claimedAt: string | null
  suspended: boolean
}

const STATUS_META: Record<AdminInvoice['status'], { label: string; color: string }> = {
  open: { label: 'Em aberto', color: 'var(--blue)' },
  awaiting_confirmation: { label: 'Aguardando conferência', color: 'var(--accent, #FF5722)' },
  overdue: { label: 'Vencida', color: 'var(--amber)' },
  paid: { label: 'Paga', color: 'var(--green)' },
  canceled: { label: 'Cancelada', color: 'var(--muted2)' },
}

type Filter = 'conferir' | 'todas' | 'aberto' | 'vencidas' | 'pagas'

const FILTER_LABEL: Record<Filter, string> = {
  conferir: 'A conferir',
  todas: 'Todas',
  aberto: 'Em aberto',
  vencidas: 'Vencidas',
  pagas: 'Pagas',
}

function fmtDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR')
}

export default function InvoicesBoard({ invoices }: { invoices: AdminInvoice[] }) {
  const [q, setQ] = useState('')
  // Abre em "A conferir" quando há pagamento declarado esperando você — é a ação pendente.
  const [filter, setFilter] = useState<Filter>(
    invoices.some((i) => i.status === 'awaiting_confirmation') ? 'conferir' : 'todas'
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    return invoices.filter((inv) => {
      if (term && !inv.storeName.toLowerCase().includes(term) && !inv.storeSlug.includes(term)) return false
      if (filter === 'conferir') return inv.status === 'awaiting_confirmation'
      if (filter === 'aberto') return inv.status === 'open'
      if (filter === 'vencidas') return inv.status === 'overdue'
      if (filter === 'pagas') return inv.status === 'paid'
      return true
    })
  }, [invoices, q, filter])

  const totals = useMemo(() => {
    const aReceber = invoices
      .filter((i) => i.status === 'open' || i.status === 'overdue' || i.status === 'awaiting_confirmation')
      .reduce((s, i) => s + i.amountCents, 0)
    const vencido = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.amountCents, 0)
    const recebido = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amountCents, 0)
    return { aReceber, vencido, recebido }
  }, [invoices])

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (!res.ok) setError(res.error || 'Erro ao atualizar a fatura.')
    })
  }

  return (
    <>
      <div className="adm-stats">
        <div className="adm-stat">
          <span className="adm-stat-label">A receber</span>
          <strong className="adm-stat-value">{fmtCents(totals.aReceber)}</strong>
        </div>
        <div className="adm-stat">
          <span className="adm-stat-label">Vencido</span>
          <strong className="adm-stat-value" style={{ color: 'var(--amber)' }}>
            {fmtCents(totals.vencido)}
          </strong>
        </div>
        <div className="adm-stat">
          <span className="adm-stat-label">Recebido</span>
          <strong className="adm-stat-value" style={{ color: 'var(--green)' }}>
            {fmtCents(totals.recebido)}
          </strong>
        </div>
      </div>

      <div className="adm-toolbar">
        <label className="adm-search">
          <Search size={14} strokeWidth={2.4} />
          <input
            placeholder="Buscar loja…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar loja"
          />
        </label>
        <div className="adm-tabs">
          {(['conferir', 'todas', 'aberto', 'vencidas', 'pagas'] as Filter[]).map((f) => {
            const count = f === 'conferir' ? invoices.filter((i) => i.status === 'awaiting_confirmation').length : 0
            return (
              <button key={f} className={`adm-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {FILTER_LABEL[f]}
                {count > 0 && ` (${count})`}
              </button>
            )
          })}
        </div>
      </div>

      {error && <p className="adm-toggle-error">{error}</p>}

      {shown.length === 0 ? (
        <p className="adm-subtitle">Nenhuma fatura aqui.</p>
      ) : (
        <div className="adm-grid">
          {shown.map((inv) => {
            const meta = STATUS_META[inv.status]
            return (
              <article key={inv.id} className="adm-card">
                <header style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <strong style={{ fontSize: 15 }}>{inv.storeName}</strong>
                    <div style={{ fontSize: 11, opacity: 0.6 }}>/{inv.storeSlug}</div>
                  </div>
                  <span style={{ color: meta.color, fontSize: 11, fontWeight: 700 }}>
                    {meta.label}
                    {inv.suspended && ' · suspensa'}
                  </span>
                </header>

                <p style={{ fontSize: 20, fontWeight: 800, margin: '10px 0 2px' }}>
                  {fmtCents(inv.amountCents)}
                </p>
                <p style={{ fontSize: 12, opacity: 0.7, margin: 0 }}>
                  {inv.status === 'paid' && inv.paidAt
                    ? `Paga em ${new Date(inv.paidAt).toLocaleDateString('pt-BR')}`
                    : inv.status === 'awaiting_confirmation' && inv.claimedAt
                      ? `Avisou que pagou em ${new Date(inv.claimedAt).toLocaleString('pt-BR')}`
                      : `Vencimento ${fmtDate(inv.dueDate)}`}
                </p>

                {inv.status === 'awaiting_confirmation' && (
                  <p style={{ fontSize: 11, opacity: 0.6, margin: '6px 0 0' }}>
                    Confira {fmtCents(inv.amountCents)} no extrato antes de confirmar.
                  </p>
                )}

                {inv.status !== 'paid' && inv.status !== 'canceled' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <button
                      className="adm-btn pro"
                      disabled={pending}
                      onClick={() =>
                        act(
                          () => markInvoicePaidManually(inv.id),
                          `Confirmar ${fmtCents(inv.amountCents)} de ${inv.storeName}? Isso libera mais um mês.`
                        )
                      }
                    >
                      <Check size={13} strokeWidth={2.6} />{' '}
                      {inv.status === 'awaiting_confirmation' ? 'Confirmar' : 'Dar baixa'}
                    </button>

                    {inv.status === 'awaiting_confirmation' && (
                      <button
                        className="adm-btn ghost"
                        disabled={pending}
                        onClick={() =>
                          act(
                            () => rejectPaymentClaim(inv.id),
                            `O Pix de ${inv.storeName} não apareceu no extrato? A fatura volta a ficar vencida.`
                          )
                        }
                      >
                        <X size={13} strokeWidth={2.4} /> Não caiu
                      </button>
                    )}

                    <button
                      className="adm-btn ghost"
                      disabled={pending}
                      onClick={() =>
                        act(() => cancelInvoice(inv.id), `Cancelar a fatura de ${inv.storeName}?`)
                      }
                    >
                      <Ban size={13} strokeWidth={2.4} /> Cancelar
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}
