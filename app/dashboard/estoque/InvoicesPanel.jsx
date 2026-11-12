'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, FileUp, Plug } from 'lucide-react'
import { toast } from 'sonner'
import { importInvoiceXml } from './actions'
import HelpTip from '@/components/dashboard/HelpTip'
import { fmtCnpj, fmtMoney } from '@/lib/stock/format'

const FILTERS = [
  { key: 'pendente', label: 'Pendentes' },
  { key: 'lancada', label: 'Lançadas' },
  { key: 'descartada', label: 'Descartadas' },
]

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
})

export default function InvoicesPanel({ invoices, filter, counts }) {
  const router = useRouter()
  const inputRef = useRef(null)
  const [pending, start] = useTransition()
  const [dragging, setDragging] = useState(false)

  function upload(file) {
    if (!file) return
    if (!/\.xml$/i.test(file.name) && !/xml/.test(file.type)) {
      toast.error('Envie o arquivo .xml da nota (não o PDF/DANFE).')
      return
    }
    const fd = new FormData()
    fd.append('xml', file)
    start(async () => {
      const res = await importInvoiceXml(fd)
      if (inputRef.current) inputRef.current.value = ''
      if (!res.ok) return toast.error(res.error)
      toast.success(
        res.mapped === res.total
          ? 'Nota importada — todos os itens já reconhecidos'
          : `Nota importada — ${res.mapped} de ${res.total} itens reconhecidos`
      )
      router.push(`/dashboard/estoque/notas/${res.id}`)
    })
  }

  return (
    <section className="stk-panel">
      <ol className="stk-steps" aria-label="Como dar entrada numa nota">
        <li><span className="stk-flow-num" aria-hidden>1</span><span><strong>Envie o XML</strong>O arquivo .xml que o fornecedor manda por e-mail (não o PDF).</span></li>
        <li><span className="stk-flow-num" aria-hidden>2</span><span><strong>Revise os itens</strong>Ligue cada item a um insumo e ajuste a conversão (ex.: 1 CX = 20 un).</span></li>
        <li><span className="stk-flow-num" aria-hidden>3</span><span><strong>Lance no estoque</strong>O saldo sobe e o custo médio é recalculado na hora.</span></li>
      </ol>
      <div
        className={`stk-drop ${dragging ? 'is-over' : ''} ${pending ? 'is-busy' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          upload(e.dataTransfer.files?.[0])
        }}
      >
        <span className="stk-drop-ico" aria-hidden><FileUp size={22} strokeWidth={2} /></span>
        <div className="stk-drop-text">
          <strong>{pending ? 'Lendo a nota…' : 'Importar nota fiscal (XML)'}</strong>
          <span>Arraste o arquivo .xml que o fornecedor enviou, ou escolha no computador. Fornecedor, itens e valores são lidos automaticamente.</span>
        </div>
        <button type="button" className="stk-btn stk-btn--primary" onClick={() => inputRef.current?.click()} disabled={pending}>
          Escolher arquivo
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xml,text/xml,application/xml"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => upload(e.target.files?.[0])}
        />
      </div>

      <p className="stk-hint">
        <Plug size={14} strokeWidth={2} aria-hidden />
        Quer receber as notas sozinhas, direto da Sefaz?{' '}
        <Link href="/dashboard/integracoes">Veja a integração com a Focus NFe</Link>
      </p>

      <div className="stk-toolbar">
        <div className="stk-pills" role="tablist" aria-label="Filtrar notas">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === 'pendente' ? '/dashboard/estoque?tab=notas' : `/dashboard/estoque?tab=notas&status=${f.key}`}
              role="tab"
              aria-selected={filter === f.key}
              className={`stk-pill ${filter === f.key ? 'active' : ''}`}
            >
              {f.label} <span className="stk-pill-count">{counts[f.key] ?? 0}</span>
            </Link>
          ))}
        </div>
        <HelpTip label="O que são esses filtros?">
          <strong>Pendentes</strong>: importadas, mas ainda fora do estoque; abra e clique em Lançar.{' '}
          <strong>Lançadas</strong>: já somaram nos insumos. <strong>Descartadas</strong>: você decidiu não usar.
        </HelpTip>
      </div>

      {invoices.length === 0 ? (
        <div className="stk-empty">
          <span className="stk-empty-ico" aria-hidden><FileText size={26} strokeWidth={1.8} /></span>
          <p className="stk-empty-title">
            {filter === 'pendente' ? 'Nenhuma nota esperando revisão' : filter === 'lancada' ? 'Nenhuma nota lançada ainda' : 'Nenhuma nota descartada'}
          </p>
          {filter === 'pendente' && <p className="stk-empty-sub">Importe o XML de uma compra para dar entrada nos insumos.</p>}
        </div>
      ) : (
        <div className="stk-table-wrap">
          <table className="stk-table">
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Nota</th>
                <th>Emissão</th>
                <th className="num">Valor</th>
                <th className="num">Itens</th>
                <th>
                  Origem
                  <HelpTip>
                    <strong>XML</strong>: você enviou o arquivo. <strong>Automático</strong>: a nota chegou sozinha pela
                    integração com a Sefaz (Focus NFe).
                  </HelpTip>
                </th>
                <th className="actions"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <div className="stk-name">{inv.supplier_name}</div>
                    {inv.supplier_cnpj && <div className="stk-sub">{fmtCnpj(inv.supplier_cnpj)}</div>}
                  </td>
                  <td className="tabnum">{inv.number ? `nº ${inv.number}${inv.series ? ` / ${inv.series}` : ''}` : '—'}</td>
                  <td className="tabnum muted">{inv.issued_at ? dateFmt.format(new Date(inv.issued_at)) : '—'}</td>
                  <td className="num">{fmtMoney(inv.total_cents)}</td>
                  <td className="num">{inv.purchase_invoice_items?.[0]?.count ?? 0}</td>
                  <td>
                    <span className={`stk-chip ${inv.source === 'focus' ? 'is-ok' : ''}`}>
                      {inv.source === 'focus' ? 'Automático' : 'XML'}
                    </span>
                  </td>
                  <td className="actions">
                    <Link href={`/dashboard/estoque/notas/${inv.id}`} className="stk-btn stk-btn--ghost">
                      {inv.status === 'pendente' ? 'Revisar e lançar' : 'Ver'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
