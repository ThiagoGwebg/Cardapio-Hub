'use client'

import { useMemo, useState, useTransition } from 'react'
import { Archive, ArchiveRestore, ArrowLeftRight, ArrowRight, Pencil, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import Modal from './Modal'
import HelpTip from '@/components/dashboard/HelpTip'
import { AvgCostVisual, BalanceVisual, CountVisual, StatusVisual } from './visuals'
import { moveStock, saveStockItem, setStockItemActive } from './actions'
import { STOCK_UNITS, fmtMoney, fmtQty, parseDecimal, stockStatus, toNum } from '@/lib/stock/format'

const STATUS_CHIP = {
  ok: { label: 'Normal', cls: 'is-ok' },
  baixo: { label: 'Acabando', cls: 'is-warn' },
  zerado: { label: 'Sem estoque', cls: 'is-bad' },
}

export default function StockItemsTable({ items, initialFilter = 'ativos' }) {
  const [filter, setFilter] = useState(initialFilter)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null) // {} = novo; item = editar
  const [moving, setMoving] = useState(null)

  const counts = useMemo(() => {
    const active = items.filter((i) => i.is_active)
    return {
      ativos: active.length,
      baixo: active.filter((i) => stockStatus(i) !== 'ok').length,
      arquivados: items.length - active.length,
    }
  }, [items])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((i) => {
      if (filter === 'arquivados' ? i.is_active : !i.is_active) return false
      if (filter === 'baixo' && stockStatus(i) === 'ok') return false
      return !q || i.name.toLowerCase().includes(q)
    })
  }, [items, filter, query])

  const totalValue = useMemo(
    () => items.filter((i) => i.is_active).reduce((s, i) => s + Math.max(0, toNum(i.quantity)) * toNum(i.avg_cost_cents), 0),
    [items]
  )

  return (
    <section className="stk-panel">
      <div className="stk-toolbar">
        <div className="stk-pills" role="tablist" aria-label="Filtrar insumos">
          {[
            ['ativos', 'Ativos'],
            ['baixo', 'Acabando'],
            ['arquivados', 'Arquivados'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              className={`stk-pill ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label} <span className="stk-pill-count">{counts[key]}</span>
            </button>
          ))}
        </div>
        <div className="stk-toolbar-end">
          <label className="stk-search">
            <Search size={15} strokeWidth={2} aria-hidden />
            <input
              type="search"
              placeholder="Buscar insumo"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar insumo"
            />
          </label>
          <button type="button" className="stk-btn stk-btn--primary" onClick={() => setEditing({})}>
            <Plus size={16} strokeWidth={2.4} aria-hidden /> Novo insumo
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="stk-empty">
          <p className="stk-empty-title">Cadastre o primeiro insumo</p>
          <p className="stk-empty-sub">
            Pão, carne, queijo, embalagem… Tudo o que você compra para produzir. Ou importe uma nota fiscal em
            <strong> Notas de compra</strong> e os insumos são criados a partir dela.
          </p>
          <button type="button" className="stk-btn stk-btn--primary" onClick={() => setEditing({})}>
            <Plus size={16} strokeWidth={2.4} aria-hidden /> Novo insumo
          </button>
        </div>
      ) : (
        <div className="stk-table-wrap">
          <table className="stk-table">
            <thead>
              <tr>
                <th>Insumo</th>
                <th className="num">
                  Em estoque
                  <HelpTip title="Em estoque (saldo)" example={<BalanceVisual />}>
                    Quanto você tem agora. <strong>Sobe</strong> com notas e entradas; <strong>desce</strong> com as vendas
                    (pela ficha técnica), saídas e perdas.
                  </HelpTip>
                </th>
                <th className="num">
                  Mínimo
                  <HelpTip title="Estoque mínimo">Quando o saldo fica abaixo disso, o insumo entra nos alertas para você lembrar de comprar.</HelpTip>
                </th>
                <th className="num">
                  Custo por unidade
                  <HelpTip title="Custo por unidade (custo médio)" example={<AvgCostVisual />}>
                    Quanto custa 1 unidade, na média das suas compras. A cada compra com preço o sistema recalcula. Ex.: 10 kg a
                    R$ 40 + 5 kg a R$ 46 = 15 kg a <strong>R$ 42/kg</strong>.
                  </HelpTip>
                </th>
                <th className="num">
                  Valor em estoque
                  <HelpTip title="Valor em estoque">Saldo × custo médio: quanto dinheiro está parado nesse insumo agora.</HelpTip>
                </th>
                <th>
                  Situação
                  <HelpTip title="Situação" example={<StatusVisual />}>
                    <strong>Normal</strong>, <strong>Acabando</strong> (abaixo do mínimo) ou <strong>Sem estoque</strong>. Saldo negativo
                    quer dizer que vendeu mais do que deu entrada: use Atualizar › Contei.
                  </HelpTip>
                </th>
                <th className="actions"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => {
                const st = STATUS_CHIP[stockStatus(i)]
                return (
                  <tr key={i.id} className={i.is_active ? '' : 'is-muted'}>
                    <td className="stk-name">{i.name}</td>
                    <td className={`num ${st.cls === 'is-ok' ? '' : st.cls}`}>{fmtQty(i.quantity, i.unit)}</td>
                    <td className="num muted">{toNum(i.min_quantity) > 0 ? fmtQty(i.min_quantity, i.unit) : '—'}</td>
                    <td className="num">{toNum(i.avg_cost_cents) > 0 ? `${fmtMoney(i.avg_cost_cents, { fine: true })}/${i.unit}` : '—'}</td>
                    <td className="num">{fmtMoney(Math.max(0, toNum(i.quantity)) * toNum(i.avg_cost_cents))}</td>
                    <td>{i.is_active ? <span className={`stk-chip ${st.cls}`}>{st.label}</span> : <span className="stk-chip">Arquivado</span>}</td>
                    <td className="actions">
                      {i.is_active && (
                        <button type="button" className="stk-btn stk-btn--ghost" onClick={() => setMoving(i)}>
                          <ArrowLeftRight size={15} strokeWidth={2} aria-hidden /> Atualizar
                        </button>
                      )}
                      <button type="button" className="stk-icon-btn" onClick={() => setEditing(i)} aria-label={`Editar ${i.name}`}>
                        <Pencil size={15} strokeWidth={2} />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="stk-empty-row">Nenhum insumo neste filtro.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {items.length > 0 && (
        <p className="stk-foot-note">Valor total em estoque: <strong>{fmtMoney(totalValue)}</strong> (quantidade × custo por unidade de cada insumo)</p>
      )}

      {editing && <ItemForm item={editing} onClose={() => setEditing(null)} />}
      {moving && <MovementForm item={moving} onClose={() => setMoving(null)} />}
    </section>
  )
}

function ItemForm({ item, onClose }) {
  const isNew = !item.id
  const [pending, start] = useTransition()
  const [form, setForm] = useState({
    name: item.name || '',
    unit: item.unit || 'un',
    minQuantity: item.min_quantity != null ? String(toNum(item.min_quantity)).replace('.', ',') : '',
    initialQuantity: '',
    unitCost: '',
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function submit(e) {
    e.preventDefault()
    start(async () => {
      const res = await saveStockItem({ id: item.id, ...form })
      if (!res.ok) return toast.error(res.error)
      toast.success(isNew ? 'Insumo criado' : 'Insumo salvo')
      onClose()
    })
  }

  function toggleArchive() {
    start(async () => {
      const res = await setStockItemActive(item.id, !item.is_active)
      if (!res.ok) return toast.error(res.error)
      toast.success(item.is_active ? 'Insumo arquivado' : 'Insumo reativado')
      onClose()
    })
  }

  return (
    <Modal
      title={isNew ? 'Novo insumo' : 'Editar insumo'}
      subtitle={isNew ? 'O que você compra para produzir: ingrediente, embalagem, bebida…' : undefined}
      onClose={onClose}
      footer={
        <>
          {!isNew && (
            <button type="button" className="stk-btn stk-btn--ghost" onClick={toggleArchive} disabled={pending}>
              {item.is_active ? <Archive size={15} strokeWidth={2} aria-hidden /> : <ArchiveRestore size={15} strokeWidth={2} aria-hidden />}
              {item.is_active ? 'Arquivar' : 'Reativar'}
            </button>
          )}
          <span className="stk-spacer" />
          <button type="button" className="stk-btn" onClick={onClose}>Cancelar</button>
          <button type="submit" form="stk-item-form" className="stk-btn stk-btn--primary" disabled={pending}>
            {pending ? 'Salvando…' : isNew ? 'Criar insumo' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="stk-item-form" className="stk-form" onSubmit={submit}>
        <label className="stk-field">
          <span>Nome</span>
          <input className="form-input" value={form.name} onChange={set('name')} placeholder="Ex.: Blend de carne 180g" required autoFocus maxLength={120} />
        </label>
        <div className="stk-grid-2">
          <label className="stk-field">
            <span>
              Unidade de controle
              <HelpTip>
                A unidade em que você conta o insumo na cozinha. O saldo e a ficha técnica usam ela. Ex.: blend em
                <strong> un</strong>, cheddar em <strong>kg</strong>, molho em <strong>ml</strong>.
              </HelpTip>
            </span>
            <select className="form-input" value={form.unit} onChange={set('unit')}>
              {STOCK_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </label>
          <label className="stk-field">
            <span>Estoque mínimo</span>
            <input className="form-input" inputMode="decimal" value={form.minQuantity} onChange={set('minQuantity')} placeholder="0" />
            <small>Abaixo disso, o insumo entra nos alertas.</small>
          </label>
        </div>
        {isNew && (
          <div className="stk-grid-2">
            <label className="stk-field">
              <span>Quantidade atual (opcional)</span>
              <input className="form-input" inputMode="decimal" value={form.initialQuantity} onChange={set('initialQuantity')} placeholder="0" />
            </label>
            <label className="stk-field">
              <span>
                Custo por {form.unit} (R$, opcional)
                <HelpTip>Quanto você pagou por 1 {form.unit}. Serve de ponto de partida para o custo médio e o custo dos pratos.</HelpTip>
              </span>
              <input className="form-input" inputMode="decimal" value={form.unitCost} onChange={set('unitCost')} placeholder="0,00" />
            </label>
          </div>
        )}
      </form>
    </Modal>
  )
}

const MOVE_KINDS = [
  { key: 'entrada', label: 'Chegou', help: 'Chegou mercadoria sem nota fiscal (feira, mercado, açougue). Se informar o preço, o custo por unidade é atualizado.' },
  { key: 'saida', label: 'Usei', help: 'Usou fora das vendas: lanche da equipe, teste de receita, cortesia.' },
  { key: 'perda', label: 'Perdi', help: 'Venceu, estragou, caiu no chão ou foi jogado fora.' },
  { key: 'contagem', label: 'Contei', help: 'Contou o estoque? Digite quanto TEM agora. O sistema corrige a diferença sozinho.' },
]

function MovementForm({ item, onClose }) {
  const [pending, start] = useTransition()
  const [kind, setKind] = useState('entrada')
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [note, setNote] = useState('')
  const help = MOVE_KINDS.find((k) => k.key === kind)?.help
  // Prévia: como o saldo fica se você confirmar.
  const q = parseDecimal(quantity)
  const current = toNum(item.quantity)
  const validQty = kind === 'contagem' ? q >= 0 : q > 0
  const after = !validQty ? null : kind === 'contagem' ? q : kind === 'entrada' ? current + q : current - q

  function submit(e) {
    e.preventDefault()
    start(async () => {
      const res = await moveStock({ itemId: item.id, kind, quantity, unitCost, note })
      if (!res.ok) return toast.error(res.error)
      toast.success(res.unchanged ? 'O estoque já estava certo' : 'Estoque atualizado')
      onClose()
    })
  }

  return (
    <Modal
      title={`Atualizar estoque: ${item.name}`}
      subtitle={`Você tem agora: ${fmtQty(item.quantity, item.unit)}`}
      onClose={onClose}
      footer={
        <>
          <span className="stk-spacer" />
          <button type="button" className="stk-btn" onClick={onClose}>Cancelar</button>
          <button type="submit" form="stk-move-form" className="stk-btn stk-btn--primary" disabled={pending}>
            {pending ? 'Registrando…' : 'Registrar'}
          </button>
        </>
      }
    >
      <form id="stk-move-form" className="stk-form" onSubmit={submit}>
        <div className="stk-segment" role="radiogroup" aria-label="Tipo de movimentação">
          {MOVE_KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              role="radio"
              aria-checked={kind === k.key}
              className={`stk-segment-btn ${kind === k.key ? 'active' : ''}`}
              onClick={() => setKind(k.key)}
            >
              {k.label}
            </button>
          ))}
        </div>
        <p className="stk-help">{help}</p>
        {kind === 'contagem' && (
          <div className="stk-guide-figure vx-on-light">
            <CountVisual />
          </div>
        )}
        <div className="stk-grid-2">
          <label className="stk-field">
            <span>{kind === 'contagem' ? `Quanto tem agora (${item.unit})` : kind === 'entrada' ? `Quanto chegou (${item.unit})` : kind === 'perda' ? `Quanto perdeu (${item.unit})` : `Quanto usou (${item.unit})`}</span>
            <input className="form-input" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} required autoFocus placeholder="0" />
          </label>
          {kind === 'entrada' && (
            <label className="stk-field">
              <span>Preço pago por {item.unit} (R$, opcional)</span>
              <input className="form-input" inputMode="decimal" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="0,00" />
            </label>
          )}
        </div>
        <label className="stk-field">
          <span>Observação (opcional)</span>
          <input className="form-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={kind === 'perda' ? 'Ex.: lote vencido' : ''} />
        </label>
        <div className="stk-preview" aria-live="polite">
          <span className="stk-preview-label">Estoque</span>
          <span className="stk-preview-val">{fmtQty(current, item.unit)}</span>
          <ArrowRight size={15} strokeWidth={2.2} aria-hidden />
          {after === null ? (
            <span className="stk-preview-label">digite a quantidade</span>
          ) : (
            <span className={`stk-preview-val ${after > current ? 'is-up' : after < current ? 'is-down' : ''}`}>
              {fmtQty(after, item.unit)}
            </span>
          )}
          {after !== null && after < 0 && <span className="stk-preview-label">fica negativo</span>}
        </div>
      </form>
    </Modal>
  )
}
