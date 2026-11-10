import { getCurrentStore } from '@/lib/store'
import { fmtCents } from '@/lib/format'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  createOptionGroup,
  deleteOptionGroup,
  createOptions,
  updateProduct,
  deleteProduct,
} from '../actions'
import OptionEditor from '../OptionEditor'
import GroupPresetFields from '../GroupPresetFields'
import ProductImagesField from '@/components/ProductImagesField'
import DeleteProductButton from '../DeleteProductButton'
import SubmitButton from '@/components/ui/SubmitButton'
import ArSection from './ArSection'
import { getStorePlan } from '@/lib/plan'
import { arEnabled, getArUsage } from '@/lib/ar/config'

export default async function ProductEditPage({ params }) {
  const { id } = await params
  const { supabase, store } = await getCurrentStore()

  const { data: product } = await supabase
    .from('products')
    .select('id, name, description, price_cents, image_url, images, store_id, ar_model_url, ar_size_cm, categories(name)')
    .eq('id', id)
    .eq('store_id', store.id)
    .maybeSingle()

  if (!product) notFound()

  const images = Array.isArray(product.images) ? (product.images) : []
  const categoryName = (product.categories)?.name ?? ''

  const { data: groups } = await supabase
    .from('product_option_groups')
    .select('id, name, required, min_select, max_select, sort_order, product_options(id, name, price_delta_cents, is_active, sort_order, image_url, description)')
    .eq('product_id', id)
    .order('sort_order', { ascending: true })

  // Realidade aumentada: plano, cota do mês e a última geração do produto.
  const [plan, usage, { data: lastGens }] = await Promise.all([
    getStorePlan(supabase, store.id),
    getArUsage(supabase, store.id),
    supabase
      .from('ar_generations')
      .select('id, status, model_url, size_cm, error')
      .eq('product_id', id)
      .order('created_at', { ascending: false })
      .limit(1),
  ])
  // Descartada/publicada não precisa reaparecer na revisão.
  const lastGen = lastGens?.[0] && ['processing', 'ready', 'failed'].includes(lastGens[0].status)
    ? lastGens[0]
    : null

  return (
    <>
      <div className="dash-header">
        <div>
          <Link href="/dashboard/cardapio" style={{ fontSize: 13, color: 'var(--primary)', textDecoration: 'none' }}>← Cardápio</Link>
          <div className="dash-title">Editar — {product.name}</div>
        </div>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Base {fmtCents(product.price_cents)}</span>
      </div>

      <div className="settings-card">
        <div className="settings-section-title">Dados do produto</div>
        <form action={updateProduct.bind(null, product.id)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome</label>
              <input className="form-input" name="name" defaultValue={product.name} required />
            </div>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <input className="form-input" name="category" defaultValue={categoryName} placeholder="Geral" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Preço (R$)</label>
              <input className="form-input" name="price" type="number" step="0.01" min="0" defaultValue={(product.price_cents / 100).toFixed(2)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <input className="form-input" name="description" defaultValue={product.description ?? ''} />
            </div>
          </div>
          <ProductImagesField
            name="images"
            label="Fotos do produto"
            defaultUrls={images}
            hint="A 1ª foto é a capa. Toque em “capa” numa foto pra promovê-la. Até 5 MB cada."
            max={6}
          />
          <SubmitButton className="save-btn" style={{ alignSelf: 'flex-start' }}>Salvar alterações</SubmitButton>
        </form>
      </div>

      <ArSection
        productId={product.id}
        plan={plan}
        enabled={arEnabled()}
        usage={usage}
        latestGen={lastGen}
        publishedUrl={product.ar_model_url ?? null}
        publishedSizeCm={product.ar_size_cm ?? null}
      />

      <div className="settings-section-title" style={{ marginTop: 8 }}>Complementos</div>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
        Crie grupos de escolhas (ex.: <b>Escolha os Salgadinhos</b>, <b>Tamanho</b>, <b>Adicionais</b>) e liste as opções.
        No grupo, escolha um <b>modelo pronto</b> — sem precisar entender de mín./máx.
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
                <SubmitButton className="ordertype-btn" style={{ flex: 'none', padding: '6px 12px' }} pendingLabel="Excluindo…">Excluir grupo</SubmitButton>
              </form>
            </div>

            {options.map((o) => (
              <OptionEditor
                key={o.id}
                productId={product.id}
                optionId={o.id}
                name={o.name}
                priceDeltaCents={o.price_delta_cents}
                isActive={o.is_active}
                imageUrl={o.image_url ?? null}
                description={o.description ?? null}
              />
            ))}

            <form action={createOptions.bind(null, product.id, g.id)} style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className="form-label">Adicionar opções — uma por linha</label>
              <textarea
                className="form-input"
                name="bulk"
                rows={4}
                placeholder={'Coxinha de Frango\nBolinha de Queijo\nCalabresa\nBacon | 2,50   ← põe o acréscimo depois da barra'}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                required
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <SubmitButton className="save-btn" style={{ marginBottom: 0 }} pendingLabel="Adicionando…">Adicionar opções</SubmitButton>
                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                  Cole a lista inteira de uma vez. Sem valor = sem acréscimo.
                </span>
              </div>
            </form>
          </div>
        )
      })}

      <div className="settings-card">
        <div className="settings-section-title">Novo grupo de complementos</div>
        <form action={createOptionGroup.bind(null, product.id)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Nome do grupo</label>
            <input className="form-input" name="name" placeholder="Ex.: Escolha os Salgadinhos, Tamanho, Adicionais" required />
          </div>
          <GroupPresetFields />
          <SubmitButton className="save-btn" style={{ alignSelf: 'flex-start' }} pendingLabel="Criando…">Criar grupo</SubmitButton>
        </form>
      </div>

      <div className="settings-card" style={{ borderColor: 'var(--red)' }}>
        <div className="settings-section-title" style={{ color: 'var(--red)' }}>Excluir produto</div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
          Remove o produto e seus complementos do cardápio. O histórico de pedidos é preservado. Não dá pra desfazer.
        </p>
        <DeleteProductButton action={deleteProduct.bind(null, product.id)} productName={product.name} />
      </div>
    </>
  )
}
