'use client'

import { useMemo, useState, useTransition } from 'react'
import { ChevronRight, Plus, Search, Trash2, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'
import { saveRecipe } from './actions'
import HelpTip from '@/components/dashboard/HelpTip'
import { MarginVisual, SaleVisual } from './visuals'
import { fmtMoney, parseDecimal, toNum } from '@/lib/stock/format'

// Ficha técnica = quanto de cada insumo sai do estoque por 1 unidade vendida.
// A baixa é automática quando o pedido entra em preparo (ou é concluído).

function recipeCost(rows, itemById) {
  return rows.reduce((s, r) => s + toNum(r.quantity) * toNum(itemById.get(r.item_id)?.avg_cost_cents), 0)
}

export default function RecipesPanel({ products, recipes, items, selectedId }) {
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(selectedId || products[0]?.id || null)

  const byProduct = useMemo(() => {
    const m = new Map()
    for (const r of recipes) {
      const key = r.product_id ? `p:${r.product_id}` : `o:${r.option_id}`
      if (!m.has(key)) m.set(key, [])
      m.get(key).push(r)
    }
    return m
  }, [recipes])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => !q || p.name.toLowerCase().includes(q))
  }, [products, query])

  const withRecipe = products.filter((p) => (byProduct.get(`p:${p.id}`) ?? []).length > 0).length
  const product = products.find((p) => p.id === selected)

  if (products.length === 0) {
    return (
      <section className="stk-panel">
        <div className="stk-empty">
          <span className="stk-empty-ico" aria-hidden><UtensilsCrossed size={26} strokeWidth={1.8} /></span>
          <p className="stk-empty-title">Cadastre produtos no Cardápio primeiro</p>
          <p className="stk-empty-sub">A ficha técnica diz quanto de cada insumo um produto consome.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="stk-recipes">
      <aside className="stk-recipes-list">
        <div className="stk-recipes-list-head">
          <label className="stk-search">
            <Search size={15} strokeWidth={2} aria-hidden />
            <input type="search" placeholder="Buscar produto" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar produto" />
          </label>
          <p className="stk-sub">{withRecipe} de {products.length} produtos com ficha técnica</p>
        </div>
        <ul>
          {list.map((p) => {
            const rows = byProduct.get(`p:${p.id}`) ?? []
            const cost = recipeCost(rows, itemById)
            const margin = p.price_cents > 0 && rows.length ? ((p.price_cents - cost) / p.price_cents) * 100 : null
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className={`stk-recipe-row ${selected === p.id ? 'active' : ''}`}
                  onClick={() => setSelected(p.id)}
                  aria-current={selected === p.id ? 'true' : undefined}
                >
                  <span className="stk-recipe-row-main">
                    <span className="stk-name">{p.name}</span>
                    <span className="stk-sub">
                      {rows.length ? `${rows.length} ${rows.length === 1 ? 'insumo' : 'insumos'} · custo ${fmtMoney(cost)}` : 'Sem ficha técnica'}
                    </span>
                  </span>
                  {margin !== null && (
                    <span className={`stk-margin ${margin < 50 ? 'is-low' : ''}`} title="Margem sobre o preço de venda">
                      {margin.toFixed(0)}%
                    </span>
                  )}
                  <ChevronRight size={16} strokeWidth={2} aria-hidden className="stk-chev" />
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      <div className="stk-recipes-editor">
        {product ? (
          <ProductRecipe key={product.id} product={product} byProduct={byProduct} items={items} itemById={itemById} />
        ) : (
          <p className="stk-sub">Escolha um produto na lista.</p>
        )}
      </div>
    </section>
  )
}

function ProductRecipe({ product, byProduct, items, itemById }) {
  const options = (product.product_option_groups ?? []).flatMap((g) =>
    (g.product_options ?? []).map((o) => ({ ...o, groupName: g.name }))
  )
  return (
    <>
      <RecipeEditor
        title={product.name}
        subtitle={product.categories?.name}
        priceCents={product.price_cents}
        target={{ productId: product.id }}
        initialRows={byProduct.get(`p:${product.id}`) ?? []}
        items={items}
        itemById={itemById}
      />
      {options.length > 0 && (
        <div className="stk-options">
          <h3 className="stk-h3">
            Adicionais e opções
            <HelpTip>
              Quando o cliente escolhe um adicional, os insumos dele saem junto com os do produto. Ex.: &quot;Bacon extra&quot;
              = 0,03 kg de bacon. Opções que não gastam nada a mais (ex.: ponto da carne) podem ficar vazias.
            </HelpTip>
          </h3>
          <p className="stk-sub">Só preencha os que consomem insumo a mais (ex.: &quot;Bacon extra&quot; = 30 g de bacon).</p>
          {options.map((o) => (
            <details key={o.id} className="stk-option" open={(byProduct.get(`o:${o.id}`) ?? []).length > 0 || undefined}>
              <summary>
                <span className="stk-name">{o.name}</span>
                <span className="stk-sub">{o.groupName}</span>
                <span className="stk-spacer" />
                <span className="stk-sub">{(byProduct.get(`o:${o.id}`) ?? []).length ? `${(byProduct.get(`o:${o.id}`) ?? []).length} insumo(s)` : 'Sem consumo'}</span>
              </summary>
              <RecipeEditor
                compact
                target={{ optionId: o.id }}
                priceCents={o.price_delta_cents}
                initialRows={byProduct.get(`o:${o.id}`) ?? []}
                items={items}
                itemById={itemById}
              />
            </details>
          ))}
        </div>
      )}
    </>
  )
}

function RecipeEditor({ title, subtitle, priceCents, target, initialRows, items, itemById, compact = false }) {
  const [pending, start] = useTransition()
  const [rows, setRows] = useState(
    initialRows.length
      ? initialRows.map((r) => ({ key: r.id, itemId: r.item_id, quantity: String(toNum(r.quantity)).replace('.', ',') }))
      : [{ key: 'new-0', itemId: '', quantity: '' }]
  )
  const [dirty, setDirty] = useState(false)

  const cost = rows.reduce((s, r) => {
    const q = parseDecimal(r.quantity)
    return s + (q > 0 ? q * toNum(itemById.get(r.itemId)?.avg_cost_cents) : 0)
  }, 0)
  const margin = priceCents > 0 ? ((priceCents - cost) / priceCents) * 100 : null

  const update = (key, patch) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
    setDirty(true)
  }

  function save() {
    start(async () => {
      const res = await saveRecipe(target, rows.filter((r) => r.itemId))
      if (!res.ok) return toast.error(res.error)
      toast.success('Ficha técnica salva')
      setDirty(false)
    })
  }

  return (
    <div className={`stk-recipe ${compact ? 'is-compact' : ''}`}>
      {!compact && (
        <div className="stk-recipe-head">
          <div>
            <h2 className="stk-h2">{title}</h2>
            {subtitle && <p className="stk-sub">{subtitle}</p>}
          </div>
          <dl className="stk-recipe-kpis">
            <div><dt>Preço</dt><dd>{fmtMoney(priceCents)}</dd></div>
            <div>
              <dt>
                Custo do lanche
                <HelpTip title="Custo do lanche (CMV)">
                  <strong>Custo da Mercadoria Vendida</strong>: quanto custam os insumos de 1 unidade deste produto. Soma de
                  quantidade × custo médio de cada linha da ficha.
                </HelpTip>
              </dt>
              <dd>{fmtMoney(cost)}</dd>
            </div>
            <div>
              <dt>
                Margem
                <HelpTip title="Margem" example={<MarginVisual />}>
                  Quanto sobra do preço depois dos insumos: (preço − CMV) ÷ preço. Abaixo de 50% fica amarelo. Não desconta
                  taxas, mão de obra nem embalagem que não esteja na ficha.
                </HelpTip>
              </dt>
              <dd className={margin !== null && margin < 50 ? 'is-low' : ''}>{margin !== null ? `${margin.toFixed(0)}%` : '—'}</dd>
            </div>
          </dl>
        </div>
      )}

      {!compact && initialRows.length === 0 && (
        <div className="stk-recipe-example">
          <strong>Exemplo de ficha pronta:</strong> um X-Burger usa, por unidade vendida,
          <ul>
            <li>1 un de pão brioche</li>
            <li>0,18 kg de blend</li>
            <li>0,03 kg de cheddar</li>
            <li>1 un de embalagem</li>
          </ul>
        </div>
      )}
      {items.length === 0 ? (
        <p className="stk-sub">Cadastre insumos em <strong>Meus insumos</strong> para montar a ficha.</p>
      ) : (
        <div className="stk-recipe-rows">
          {!compact && (
            <div className="stk-recipe-legend">
              <span>Insumo</span>
              <span>
                Quantidade por unidade vendida
                <HelpTip title="Quantidade por unidade vendida" example={<SaleVisual />}>
                  Quanto deste insumo sai do estoque quando você vende <strong>1</strong> unidade do produto, na unidade do
                  insumo. Ex.: 1 un de pão, 0,18 kg de blend, 0,03 kg de cheddar. A baixa acontece quando o pedido entra
                  em preparo ou é concluído.
                </HelpTip>
              </span>
              <span>Custo</span>
              <span />
            </div>
          )}
          {rows.map((r) => {
            const item = itemById.get(r.itemId)
            const q = parseDecimal(r.quantity)
            return (
              <div key={r.key} className="stk-recipe-line">
                <select className="form-input" value={r.itemId} onChange={(e) => update(r.key, { itemId: e.target.value })} aria-label="Insumo">
                  <option value="">Escolher insumo…</option>
                  {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <span className="stk-qty-input">
                  <input
                    className="form-input"
                    inputMode="decimal"
                    value={r.quantity}
                    onChange={(e) => update(r.key, { quantity: e.target.value })}
                    placeholder="0"
                    aria-label="Quantidade por unidade vendida"
                  />
                  <span>{item?.unit ?? ''}</span>
                </span>
                <span className="stk-line-cost tabnum">{item && q > 0 ? fmtMoney(q * toNum(item.avg_cost_cents)) : '—'}</span>
                <button
                  type="button"
                  className="stk-icon-btn"
                  onClick={() => { setRows((rs) => rs.filter((x) => x.key !== r.key)); setDirty(true) }}
                  aria-label="Remover insumo da ficha"
                >
                  <Trash2 size={15} strokeWidth={2} />
                </button>
              </div>
            )
          })}
          <div className="stk-recipe-actions">
            <button
              type="button"
              className="stk-btn stk-btn--ghost"
              onClick={() => setRows((rs) => [...rs, { key: `new-${Date.now()}`, itemId: '', quantity: '' }])}
            >
              <Plus size={15} strokeWidth={2.4} aria-hidden /> Adicionar insumo
            </button>
            <span className="stk-spacer" />
            {compact && <span className="stk-sub">Custo: {fmtMoney(cost)}</span>}
            <button type="button" className="stk-btn stk-btn--primary" onClick={save} disabled={pending || !dirty}>
              {pending ? 'Salvando…' : dirty ? 'Salvar ficha' : 'Salvo'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
