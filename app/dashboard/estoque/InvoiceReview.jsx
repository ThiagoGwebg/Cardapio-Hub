'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CircleCheck, PackagePlus, Trash2, WandSparkles } from 'lucide-react'
import { toast } from 'sonner'
import Modal from './Modal'
import HelpTip from '@/components/dashboard/HelpTip'
import { AvgCostVisual, ConversionVisual } from './visuals'
import { createItemFromLine, createMissingItems, discardInvoice, launchInvoice, updateInvoiceLine } from './actions'
import { COST_ALERT_PCT, STOCK_UNITS, cleanItemName, costVariationPct, fmtMoney, fmtQty, guessFromLine, parseDecimal, suggestConversion, toNum } from '@/lib/stock/format'

export default function InvoiceReview({ invoice, lines: initialLines, items: initialItems }) {
  const router = useRouter()
  const editable = invoice.status === 'pendente'
  const [lines, setLines] = useState(initialLines)
  const [items, setItems] = useState(initialItems)
  const [creatingFor, setCreatingFor] = useState(null)
  const [pending, start] = useTransition()
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])

  const unresolved = lines.filter((l) => !l.ignored && !l.item_id).length
  const toLaunch = lines.filter((l) => !l.ignored && l.item_id).length

  function patchLine(id, patch, serverPatch = patch) {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)))
    start(async () => {
      const res = await updateInvoiceLine(id, serverPatch)
      if (!res.ok) {
        toast.error(res.error)
        router.refresh()
      }
    })
  }

  // Um clique: cria/liga todos os itens que faltam, com unidade e conversão sugeridas.
  function createAllMissing() {
    start(async () => {
      const res = await createMissingItems(invoice.id)
      if (!res.ok) return toast.error(res.error)
      if (res.items.length) setItems((list) => [...list, ...res.items].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
      const byLine = new Map(res.lines.map((x) => [x.id, x]))
      setLines((ls) => ls.map((l) => (byLine.has(l.id) ? { ...l, ...byLine.get(l.id) } : l)))
      toast.success(
        res.items.length
          ? `${res.items.length} ${res.items.length === 1 ? 'insumo criado' : 'insumos criados'} — confira as quantidades e dê entrada`
          : 'Itens ligados aos insumos que você já tinha'
      )
    })
  }

  function launch() {
    start(async () => {
      const res = await launchInvoice(invoice.id)
      if (!res.ok) return toast.error(res.error)
      toast.success(`Pronto! ${res.count} ${res.count === 1 ? 'insumo recebeu' : 'insumos receberam'} a entrada desta nota`)
      router.refresh()
    })
  }

  function discard() {
    if (!window.confirm('Descartar esta nota? Nada entra no estoque.')) return
    start(async () => {
      const res = await discardInvoice(invoice.id)
      if (!res.ok) return toast.error(res.error)
      toast.success('Nota descartada')
      router.push('/dashboard/estoque?tab=notas')
    })
  }

  return (
    <section className="stk-panel">
      {editable && unresolved > 0 && (
        <div className="stk-callout">
          <WandSparkles size={20} strokeWidth={2} aria-hidden className="stk-callout-ico" />
          <div className="stk-callout-text">
            <strong>
              {unresolved === 1 ? '1 item desta nota ainda não está' : `${unresolved} itens desta nota ainda não estão`} no seu estoque
            </strong>
            <span>
              O sistema cria os insumos para você, com nome, unidade e embalagem já preenchidos (ex.: &quot;PCT 12UN&quot; vira
              1 pacote = 12 un). Depois é só conferir e dar entrada.
            </span>
          </div>
          <button type="button" className="stk-btn stk-btn--primary" onClick={createAllMissing} disabled={pending}>
            <PackagePlus size={16} strokeWidth={2.2} aria-hidden />
            {pending ? 'Criando…' : unresolved === 1 ? 'Criar o insumo' : `Criar os ${unresolved} insumos`}
          </button>
        </div>
      )}
      {editable && unresolved === 0 && toLaunch > 0 && (
        <div className="stk-callout is-ready">
          <CircleCheck size={20} strokeWidth={2} aria-hidden className="stk-callout-ico" />
          <div className="stk-callout-text">
            <strong>Tudo ligado!</strong>
            <span>Confira a coluna <em>Entra no estoque</em> e clique em <strong>Dar entrada no estoque</strong> lá embaixo.</span>
          </div>
        </div>
      )}

      <div className="stk-table-wrap">
        <table className="stk-table stk-table--invoice">
          <thead>
            <tr>
              <th>Item da nota</th>
              <th className="num">Qtd. na nota</th>
              <th className="num">Valor</th>
              <th>
                Insumo no estoque
                <HelpTip>
                  Em qual insumo do seu estoque este item vai somar. Se ainda não existe, escolha <strong>+ Criar insumo
                  novo</strong>. Frete, brinde e o que não é insumo: marque <strong>Ignorar</strong>.
                </HelpTip>
              </th>
              <th>
                Embalagem
                <HelpTip title="Embalagem (conversão)" example={<ConversionVisual />}>
                  Quantas unidades do <strong>seu</strong> insumo vêm em 1 unidade da nota. Ex.: a nota vende em CX e você
                  conta em un → <strong>1 CX = 20 un</strong>. Se as unidades são iguais, deixe 1.
                </HelpTip>
              </th>
              <th className="num">
                Entra no estoque
                <HelpTip title="Entra no estoque" example={<ConversionVisual factor={20} />}>Quantidade da nota × conversão, já na unidade do insumo. É isso que soma no saldo.</HelpTip>
              </th>
              <th className="num">
                Custo
                <HelpTip title="Custo desta compra" example={<AvgCostVisual />}>
                  Preço na nota ÷ conversão = quanto custa 1 unidade do insumo nesta compra. A % compara com o custo médio
                  atual: <strong>vermelho</strong> ficou mais caro (10% ou mais), <strong>verde</strong> ficou mais barato.
                </HelpTip>
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const item = l.item_id ? itemById.get(l.item_id) : null
              const conv = toNum(l.conversion) || 1
              const qtyIn = toNum(l.quantity) * conv
              const unitCost = toNum(l.unit_price_cents) / conv
              const ref = invoice.status === 'lancada' ? l.prev_cost_cents : item?.avg_cost_cents
              const pct = item ? costVariationPct(ref, unitCost) : null
              const alert = pct !== null && Math.abs(pct) >= COST_ALERT_PCT
              return (
                <tr key={l.id} className={l.ignored ? 'is-muted' : ''}>
                  <td>
                    <div className="stk-name">{l.description}</div>
                    <div className="stk-sub">
                      {[l.code && `Cód. ${l.code}`, l.ean && `EAN ${l.ean}`].filter(Boolean).join(' · ') || `Item ${l.line}`}
                    </div>
                  </td>
                  <td className="num tabnum">{fmtQty(l.quantity, l.unit?.toLowerCase())}</td>
                  <td className="num">
                    {fmtMoney(l.total_cents)}
                    <div className="stk-sub">{fmtMoney(l.unit_price_cents, { fine: true })}/{l.unit?.toLowerCase() || 'un'}</div>
                  </td>
                  <td className="stk-cell-item">
                    {editable && !l.ignored ? (
                      <div className="stk-item-pick">
                        <select
                          className="form-input"
                          value={l.item_id || ''}
                          onChange={(e) => {
                            const v = e.target.value
                            if (v === '__new') return setCreatingFor(l)
                            // Unidades que combinam já trazem a conversão (KG→g = 1000, PCT 12UN→un = 12).
                            const sug = v ? suggestConversion(l.unit, itemById.get(v)?.unit, l.description) : null
                            const conv = sug && toNum(l.conversion) === 1 ? sug : toNum(l.conversion) || 1
                            patchLine(l.id, { item_id: v || null, conversion: conv }, { itemId: v || null, conversion: conv })
                          }}
                          aria-label={`Insumo para ${l.description}`}
                        >
                          <option value="">Escolher insumo…</option>
                          {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                          <option value="__new">+ Criar insumo novo…</option>
                        </select>
                        <label className="stk-check">
                          <input type="checkbox" checked={false} onChange={() => patchLine(l.id, { ignored: true }, { ignored: true })} />
                          Ignorar
                        </label>
                      </div>
                    ) : l.ignored ? (
                      <span className="stk-sub">
                        Ignorado{editable && (
                          <> · <button type="button" className="stk-link" onClick={() => patchLine(l.id, { ignored: false }, { ignored: false })}>desfazer</button></>
                        )}
                      </span>
                    ) : (
                      <span className="stk-name">{item?.name ?? '—'}</span>
                    )}
                  </td>
                  <td>
                    {!l.ignored && (
                      editable ? (
                        <span className="stk-conv">
                          1 {l.unit?.toLowerCase() || 'un'} =
                          <input
                            key={`${l.id}-${conv}`}
                            className="form-input"
                            inputMode="decimal"
                            defaultValue={String(conv).replace('.', ',')}
                            onBlur={(e) => {
                              const v = parseDecimal(e.target.value)
                              if (!(v > 0)) { toast.error('Digite quantas unidades vêm em cada embalagem (maior que zero).'); e.target.value = String(conv).replace('.', ','); return }
                              if (v !== conv) patchLine(l.id, { conversion: v }, { conversion: v })
                            }}
                            aria-label="Quantas unidades vêm em cada embalagem"
                          />
                          {item?.unit || ''}
                        </span>
                      ) : (
                        <span className="muted">{conv === 1 ? '—' : `1 ${l.unit?.toLowerCase()} = ${fmtQty(conv, item?.unit)}`}</span>
                      )
                    )}
                  </td>
                  <td className="num tabnum">
                    {!l.ignored && item ? (
                      <>
                        +{fmtQty(qtyIn, item.unit)}
                        {editable && item.quantity != null && (
                          <div className="stk-line-preview" title="Saldo do insumo agora → depois de lançar">
                            saldo {fmtQty(item.quantity)} → <strong>{fmtQty(toNum(item.quantity) + qtyIn)}</strong>
                          </div>
                        )}
                      </>
                    ) : '—'}
                  </td>
                  <td className="num">
                    {!l.ignored && item ? (
                      <>
                        {fmtMoney(unitCost, { fine: true })}/{item.unit}
                        {pct !== null && (
                          <div className={`stk-var ${alert ? (pct > 0 ? 'is-up' : 'is-down') : ''}`}>
                            {pct > 0 ? '+' : ''}{pct.toFixed(1).replace('.', ',')}% {invoice.status === 'lancada' ? 'vs. antes' : 'vs. atual'}
                          </div>
                        )}
                      </>
                    ) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editable && (
        <div className="stk-actions-bar">
          <button type="button" className="stk-btn stk-btn--ghost stk-btn--danger" onClick={discard} disabled={pending}>
            <Trash2 size={15} strokeWidth={2} aria-hidden /> Descartar nota
          </button>
          <span className="stk-spacer" />
          <span className="stk-sub">
            {unresolved > 0
              ? `${unresolved} ${unresolved === 1 ? 'item ainda sem insumo' : 'itens ainda sem insumo'}`
              : `${toLaunch} ${toLaunch === 1 ? 'item pronto' : 'itens prontos'} para entrar no estoque`}
          </span>
          <button type="button" className="stk-btn stk-btn--primary" onClick={launch} disabled={pending || unresolved > 0 || toLaunch === 0}>
            <Check size={16} strokeWidth={2.4} aria-hidden /> Dar entrada no estoque
          </button>
          <HelpTip label="O que acontece ao lançar?">
            Cada item vira uma <strong>entrada</strong> no estoque, o custo médio dos insumos é recalculado e o sistema
            lembra a ligação &quot;código do fornecedor → insumo&quot; para a próxima nota. Não dá para desfazer: para
            corrigir, use Atualizar › Contei.
          </HelpTip>
        </div>
      )}

      {creatingFor && (
        <CreateItemDialog
          line={creatingFor}
          onClose={() => setCreatingFor(null)}
          onCreated={(item, conversion) => {
            setItems((list) => [...list, item].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
            setLines((ls) => ls.map((l) => (l.id === creatingFor.id ? { ...l, item_id: item.id, conversion } : l)))
            setCreatingFor(null)
          }}
        />
      )}
    </section>
  )
}

function CreateItemDialog({ line, onClose, onCreated }) {
  const [pending, start] = useTransition()
  const guess = guessFromLine(line.description, line.unit)
  const [name, setName] = useState(cleanItemName(line.description))
  const [unit, setUnit] = useState(guess.unit)

  function submit(e) {
    e.preventDefault()
    start(async () => {
      const conversion = suggestConversion(line.unit, unit, line.description) ?? 1
      const res = await createItemFromLine(line.id, { name, unit, conversion })
      if (!res.ok) return toast.error(res.error)
      toast.success('Insumo criado e ligado ao item')
      onCreated({ id: res.id, name: name.trim(), unit, quantity: 0, avg_cost_cents: 0, is_active: true }, conversion)
    })
  }

  return (
    <Modal
      title="Criar insumo"
      subtitle={`A partir de: ${line.description}`}
      onClose={onClose}
      footer={
        <>
          <span className="stk-spacer" />
          <button type="button" className="stk-btn" onClick={onClose}>Cancelar</button>
          <button type="submit" form="stk-create-line" className="stk-btn stk-btn--primary" disabled={pending}>
            <PackagePlus size={16} strokeWidth={2} aria-hidden /> {pending ? 'Criando…' : 'Criar e ligar'}
          </button>
        </>
      }
    >
      <form id="stk-create-line" className="stk-form" onSubmit={submit}>
        <label className="stk-field">
          <span>Nome do insumo</span>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus maxLength={120} />
          <small>Use um nome curto que a cozinha reconheça (ex.: &quot;Queijo cheddar fatiado&quot;).</small>
        </label>
        <label className="stk-field">
          <span>Unidade de controle</span>
          <select className="form-input" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {STOCK_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
          <small>Se for diferente da unidade da nota ({line.unit || 'UN'}), ajuste a conversão depois.</small>
        </label>
      </form>
    </Modal>
  )
}
