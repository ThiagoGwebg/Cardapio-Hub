'use client'

import { useState, useTransition } from 'react'
import { Pencil, Plus, Trash2, Truck } from 'lucide-react'
import { toast } from 'sonner'
import Modal from './Modal'
import { deleteSupplier, saveSupplier } from './actions'
import { fmtCnpj, fmtMoney } from '@/lib/stock/format'

const dayFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })

export default function SuppliersPanel({ suppliers }) {
  const [editing, setEditing] = useState(null)

  return (
    <section className="stk-panel">
      <div className="stk-toolbar">
        <p className="stk-sub">Fornecedores entram sozinhos quando você importa uma nota. Cadastre à mão os que vendem sem nota.</p>
        <div className="stk-toolbar-end">
          <button type="button" className="stk-btn stk-btn--primary" onClick={() => setEditing({})}>
            <Plus size={16} strokeWidth={2.4} aria-hidden /> Novo fornecedor
          </button>
        </div>
      </div>

      {suppliers.length === 0 ? (
        <div className="stk-empty">
          <span className="stk-empty-ico" aria-hidden><Truck size={26} strokeWidth={1.8} /></span>
          <p className="stk-empty-title">Nenhum fornecedor ainda</p>
        </div>
      ) : (
        <div className="stk-table-wrap">
          <table className="stk-table">
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Contato</th>
                <th className="num">Notas lançadas</th>
                <th className="num">Comprado</th>
                <th>Última nota</th>
                <th className="actions"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => {
                const launched = (s.purchase_invoices ?? []).filter((i) => i.status === 'lancada')
                const total = launched.reduce((sum, i) => sum + (i.total_cents || 0), 0)
                const last = launched.map((i) => i.issued_at).filter(Boolean).sort().at(-1)
                return (
                  <tr key={s.id}>
                    <td>
                      <div className="stk-name">{s.name}</div>
                      {s.cnpj && <div className="stk-sub">{fmtCnpj(s.cnpj)}</div>}
                    </td>
                    <td className="muted">{[s.phone, s.email].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="num">{launched.length}</td>
                    <td className="num">{fmtMoney(total)}</td>
                    <td className="tabnum muted">{last ? dayFmt.format(new Date(last)) : '—'}</td>
                    <td className="actions">
                      <button type="button" className="stk-icon-btn" onClick={() => setEditing(s)} aria-label={`Editar ${s.name}`}>
                        <Pencil size={15} strokeWidth={2} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && <SupplierForm supplier={editing} onClose={() => setEditing(null)} />}
    </section>
  )
}

function SupplierForm({ supplier, onClose }) {
  const isNew = !supplier.id
  const [pending, start] = useTransition()
  const [form, setForm] = useState({
    name: supplier.name || '',
    cnpj: supplier.cnpj ? fmtCnpj(supplier.cnpj) : '',
    phone: supplier.phone || '',
    email: supplier.email || '',
    notes: supplier.notes || '',
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function submit(e) {
    e.preventDefault()
    start(async () => {
      const res = await saveSupplier({ id: supplier.id, ...form })
      if (!res.ok) return toast.error(res.error)
      toast.success(isNew ? 'Fornecedor criado' : 'Fornecedor salvo')
      onClose()
    })
  }

  function remove() {
    if (!window.confirm(`Remover ${supplier.name}? As notas dele continuam no histórico.`)) return
    start(async () => {
      const res = await deleteSupplier(supplier.id)
      if (!res.ok) return toast.error(res.error)
      toast.success('Fornecedor removido')
      onClose()
    })
  }

  return (
    <Modal
      title={isNew ? 'Novo fornecedor' : 'Editar fornecedor'}
      onClose={onClose}
      footer={
        <>
          {!isNew && (
            <button type="button" className="stk-btn stk-btn--ghost stk-btn--danger" onClick={remove} disabled={pending}>
              <Trash2 size={15} strokeWidth={2} aria-hidden /> Remover
            </button>
          )}
          <span className="stk-spacer" />
          <button type="button" className="stk-btn" onClick={onClose}>Cancelar</button>
          <button type="submit" form="stk-supplier-form" className="stk-btn stk-btn--primary" disabled={pending}>
            {pending ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="stk-supplier-form" className="stk-form" onSubmit={submit}>
        <label className="stk-field">
          <span>Nome</span>
          <input className="form-input" value={form.name} onChange={set('name')} required autoFocus maxLength={160} />
        </label>
        <div className="stk-grid-2">
          <label className="stk-field">
            <span>CNPJ (opcional)</span>
            <input className="form-input" inputMode="numeric" value={form.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0000-00" />
          </label>
          <label className="stk-field">
            <span>Telefone (opcional)</span>
            <input className="form-input" inputMode="tel" value={form.phone} onChange={set('phone')} />
          </label>
        </div>
        <label className="stk-field">
          <span>E-mail (opcional)</span>
          <input className="form-input" type="email" value={form.email} onChange={set('email')} />
        </label>
        <label className="stk-field">
          <span>Observações (opcional)</span>
          <textarea className="form-input" rows={2} value={form.notes} onChange={set('notes')} maxLength={500} placeholder="Ex.: entrega às terças, pedido mínimo R$ 300" />
        </label>
      </form>
    </Modal>
  )
}
