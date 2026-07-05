import { getCurrentStore } from '@/lib/store'
import { fmtCents } from '@/lib/format'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createOptionGroup, deleteOptionGroup, createOption, deleteOption } from '../actions'

export default async function ProductOptionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, store } = await getCurrentStore()

  const { data: product } = await supabase
    .from('products')
    .select('id, name, price_cents, store_id')
    .eq('id', id)
    .eq('store_id', store.id)
    .maybeSingle()

  if (!product) notFound()

  const { data: groups } = await supabase
    .from('product_option_groups')
    .select('id, name, required, min_select, max_select, sort_order, product_options(id, name, price_delta_cents, sort_order)')
    .eq('product_id', id)
    .order('sort_order', { ascending: true })

  return (
    <>
      <div className="dash-header">
        <div>
          <Link href="/dashboard/cardapio" style={{ fontSize: 13, color: 'var(--primary)', textDecoration: 'none' }}>← Cardápio</Link>
          <div className="dash-title">Complementos — {product.name}</div>
        </div>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Base {fmtCents(product.price_cents)}</span>
      </div>

      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
        Crie grupos de escolhas (ex.: <b>Tamanho</b>, <b>Ponto da carne</b>, <b>Adicionais</b>). Use <b>obrigatório</b> +
        máx. 1 para variações; opcional + máx. N para adicionais.
      </p>

      {(groups ?? []).map((g) => {
        const options = (g.product_options ?? []).sort((a, b) => a.sort_order - b.sort_order)
        return (
          <div className="settings-card" key={g.id}>
            <div className="settings-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                {g.name}{' '}
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted)' }}>
                  ({g.required ? 'obrigatório' : 'opcional'} · {g.min_select}–{g.max_select})
                </span>
              </span>
              <form action={deleteOptionGroup.bind(null, product.id, g.id)}>
                <button className="ordertype-btn" style={{ flex: 'none', padding: '6px 12px' }} type="submit">Excluir grupo</button>
              </form>
            </div>

            {options.map((o) => (
              <div className="cardapio-item" key={o.id}>
                <div className="ci-info">
                  <div className="ci-name">{o.name}</div>
                  <div className="ci-cat">{o.price_delta_cents > 0 ? `+ ${fmtCents(o.price_delta_cents)}` : 'sem acréscimo'}</div>
                </div>
                <form action={deleteOption.bind(null, product.id, o.id)}>
                  <button className="ordertype-btn" style={{ flex: 'none', padding: '6px 12px' }} type="submit">Remover</button>
                </form>
              </div>
            ))}

            <form action={createOption.bind(null, product.id, g.id)} className="form-row" style={{ marginTop: 10, alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Opção</label>
                <input className="form-input" name="name" placeholder="Ex.: Bacon" required />
              </div>
              <div className="form-group">
                <label className="form-label">Acréscimo (R$)</label>
                <input className="form-input" name="price" type="number" step="0.01" min="0" defaultValue="0" />
              </div>
              <button className="save-btn" type="submit" style={{ marginBottom: 0 }}>Adicionar</button>
            </form>
          </div>
        )
      })}

      <div className="settings-card">
        <div className="settings-section-title">Novo grupo de complementos</div>
        <form action={createOptionGroup.bind(null, product.id)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Nome do grupo</label>
            <input className="form-input" name="name" placeholder="Ex.: Adicionais, Tamanho, Ponto da carne" required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Mín. escolhas</label>
              <input className="form-input" name="minSelect" type="number" min="0" defaultValue="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Máx. escolhas</label>
              <input className="form-input" name="maxSelect" type="number" min="1" defaultValue="1" />
            </div>
            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
              <label className="toggle-row" style={{ padding: 0 }}>
                <span className="toggle-label">Obrigatório</span>
                <label className="toggle-switch"><input type="checkbox" name="required" /><span className="toggle-slider"></span></label>
              </label>
            </div>
          </div>
          <button className="save-btn" type="submit" style={{ alignSelf: 'flex-start' }}>Criar grupo</button>
        </form>
      </div>
    </>
  )
}
