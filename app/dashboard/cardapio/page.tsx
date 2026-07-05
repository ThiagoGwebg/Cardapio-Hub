import { getCurrentStore } from '@/lib/store'
import { fmtCents } from '@/lib/format'
import { IconUtensils } from '@/components/icons'
import Link from 'next/link'
import ProductToggle from './ProductToggle'
import { createProduct } from './actions'

export default async function CardapioPage() {
  const { supabase, store } = await getCurrentStore()

  const { data: products } = await supabase
    .from('products')
    .select('id, name, price_cents, image_url, is_active, categories(name)')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  return (
    <>
      <div className="dash-header">
        <div className="dash-title">Cardápio</div>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          {products?.length ?? 0} produto{products?.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="settings-card">
        <div className="settings-section-title">Novo produto</div>
        <form action={createProduct} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome</label>
              <input className="form-input" name="name" required />
            </div>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <input className="form-input" name="category" placeholder="Mini Salgados" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Preço (R$)</label>
              <input className="form-input" name="price" type="number" step="0.01" min="0" required />
            </div>
            <div className="form-group">
              <label className="form-label">URL da imagem (opcional)</label>
              <input className="form-input" name="imageUrl" placeholder="/img/fotos_produtos/..." />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <input className="form-input" name="description" />
          </div>
          <button className="save-btn" type="submit" style={{ alignSelf: 'flex-start' }}>
            Adicionar produto
          </button>
        </form>
      </div>

      <div className="settings-card">
        {(products ?? []).map((p) => (
          <div className="cardapio-item" key={p.id}>
            {p.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="ci-thumb" src={p.image_url} alt={p.name} />
            ) : (
              <span className="ci-emoji" style={{ color: 'var(--muted)' }}>
                <IconUtensils size={26} />
              </span>
            )}
            <div className="ci-info">
              <div className="ci-name">{p.name}</div>
              <div className="ci-cat">
                {(p.categories as unknown as { name: string } | null)?.name ?? 'Sem categoria'}
              </div>
            </div>
            <div className="ci-price">{fmtCents(p.price_cents)}</div>
            <Link href={`/dashboard/cardapio/${p.id}`} className="ordertype-btn" style={{ flex: 'none', padding: '6px 12px', textDecoration: 'none' }}>
              Complementos
            </Link>
            <ProductToggle productId={p.id} isActive={p.is_active} />
          </div>
        ))}
        {(products ?? []).length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhum produto cadastrado ainda.</p>
        )}
      </div>
    </>
  )
}
