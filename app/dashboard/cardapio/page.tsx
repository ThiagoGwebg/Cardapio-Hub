import { getCurrentStore } from '@/lib/store'
import { fmtCents } from '@/lib/format'
import { getStoreUsage } from '@/lib/plan'
import { IconUtensils } from '@/components/icons'
import Link from 'next/link'
import ProductToggle from './ProductToggle'
import NewProductForm from './NewProductForm'
import { UsageMeter, ProUpsellBanner } from '@/components/dashboard/ProUpsell'
import { createProduct } from './actions'

export default async function CardapioPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string }>
}) {
  const { limit } = await searchParams
  const { supabase, store } = await getCurrentStore()

  const [{ data: products }, usage] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, price_cents, image_url, is_active, categories(name)')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false }),
    getStoreUsage(supabase, store.id),
  ])

  const atLimit = !usage.isPro && usage.productCount >= usage.maxProducts
  const nearLimit = !usage.isPro && !atLimit && usage.productCount >= usage.maxProducts * 0.8

  const productList = products ?? []
  const activeCount = productList.filter((p) => p.is_active).length

  return (
    <div className="prodmgr">
      <div className="dash-header">
        <div>
          <div className="dash-title">Cardápio</div>
          <div className="prodmgr-subtitle">
            {productList.length} produto{productList.length === 1 ? '' : 's'}
            {productList.length > 0 && (
              <>
                {' · '}
                <span className="prodmgr-sub-active">{activeCount} disponíve{activeCount === 1 ? 'l' : 'is'}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {!usage.isPro && (
        <div className="settings-card">
          <UsageMeter label="Produtos do plano Lite" used={usage.productCount} limit={usage.maxProducts} />
          {(atLimit || limit) && (
            <ProUpsellBanner
              title="Limite de produtos atingido"
              text="Seu cardápio chegou ao máximo do plano Lite. Assine o Pro e cadastre produtos ilimitados."
            />
          )}
          {nearLimit && !limit && (
            <ProUpsellBanner
              title="Seu cardápio está quase cheio"
              text={`Faltam ${usage.maxProducts - usage.productCount} produto(s) para o limite do Lite. No Pro não existe limite.`}
            />
          )}
        </div>
      )}

      {!atLimit && <NewProductForm action={createProduct} />}

      {productList.length > 0 ? (
        <div className="prod-list">
          {productList.map((p) => (
            <div className={`prod-row ${p.is_active ? '' : 'prod-row--off'}`} key={p.id}>
              <div className="prod-thumb-wrap">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="prod-thumb" src={p.image_url} alt={p.name} />
                ) : (
                  <span className="prod-thumb prod-thumb--empty">
                    <IconUtensils size={22} />
                  </span>
                )}
              </div>

              <div className="prod-main">
                <div className="prod-name">{p.name}</div>
                <div className="prod-meta">
                  <span className="prod-cat-chip">
                    {(p.categories as unknown as { name: string } | null)?.name ?? 'Sem categoria'}
                  </span>
                  {!p.is_active && <span className="prod-off-chip">Esgotado</span>}
                </div>
              </div>

              <div className="prod-price">{fmtCents(p.price_cents)}</div>

              <Link href={`/dashboard/cardapio/${p.id}`} className="prod-edit-btn">
                Editar
              </Link>

              <ProductToggle productId={p.id} isActive={p.is_active} />
            </div>
          ))}
        </div>
      ) : (
        <div className="prod-empty">
          <span className="prod-empty-icon">
            <IconUtensils size={34} />
          </span>
          <p className="prod-empty-title">Seu cardápio está vazio</p>
          <p className="prod-empty-sub">Toque em “Adicionar produto” para cadastrar o primeiro item.</p>
        </div>
      )}
    </div>
  )
}
