import Link from 'next/link'
import {
  ArrowLeftRight,
  ClipboardList,
  FileText,
  Package,
  Truck,
  TriangleAlert,
} from 'lucide-react'
import { getCurrentStore } from '@/lib/store'
import { COST_ALERT_PCT, costVariationPct, stockStatus, toNum } from '@/lib/stock/format'
import StockItemsTable from './StockItemsTable'
import InvoicesPanel from './InvoicesPanel'
import MovementsTable from './MovementsTable'
import SuppliersPanel from './SuppliersPanel'
import RecipesPanel from './RecipesPanel'
import CostAlerts from './CostAlerts'
import StockGuide from './StockGuide'
import './estoque.css'

export const metadata = { title: 'Estoque' }

// `intro` aparece logo abaixo das abas: uma frase dizendo pra que serve a aba.
const TABS = [
  { key: 'geral', label: 'Meus insumos', Icon: Package, intro: 'Tudo o que você compra para produzir, com quanto tem agora e quanto custa.' },
  { key: 'notas', label: 'Notas de compra', Icon: FileText, intro: 'Dê entrada nas compras pelo arquivo XML da nota fiscal: você revisa os itens e lança tudo de uma vez.' },
  { key: 'movimentacoes', label: 'Histórico', Icon: ArrowLeftRight, intro: 'Tudo que entrou e saiu, com data e motivo. Nada é apagado: se o número estiver errado, use Atualizar › Contei.' },
  { key: 'fornecedores', label: 'Fornecedores', Icon: Truck, intro: 'Quem vende os seus insumos. Eles entram sozinhos quando você importa uma nota.' },
  { key: 'fichas', label: 'Ficha técnica', Icon: ClipboardList, intro: 'Quanto de cada insumo sai do estoque a cada produto vendido. É ela que faz a baixa automática funcionar.' },
]

// Janela dos alertas de variação de custo.
function daysAgoIso(days) {
  return new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()
}

export default async function EstoquePage({ searchParams }) {
  const sp = await searchParams
  const tab = TABS.some((t) => t.key === sp?.tab) ? sp.tab : 'geral'
  const { supabase, store } = await getCurrentStore()

  // Sempre: insumos (alertas + contadores) e notas pendentes.
  const since = daysAgoIso(60)
  const [
    { data: items },
    { count: pendingCount },
    { data: costLines },
    { count: entryCount },
    { count: saleCount },
    { data: recipeProducts },
    { count: productCount },
  ] = await Promise.all([
    supabase
      .from('stock_items')
      .select('id, name, unit, quantity, min_quantity, avg_cost_cents, last_cost_cents, is_active')
      .eq('store_id', store.id)
      .order('name'),
    supabase
      .from('purchase_invoices')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store.id)
      .eq('status', 'pendente'),
    supabase
      .from('purchase_invoice_items')
      .select('id, description, unit_price_cents, conversion, prev_cost_cents, item_id, purchase_invoices!inner(status, launched_at, supplier_name)')
      .eq('store_id', store.id)
      .eq('cost_alert_ack', false)
      .not('prev_cost_cents', 'is', null)
      .eq('purchase_invoices.status', 'lancada')
      .gte('purchase_invoices.launched_at', since),
    // Contagens do guia "Como funciona o estoque".
    supabase.from('stock_movements').select('id', { count: 'exact', head: true }).eq('store_id', store.id).eq('kind', 'entrada'),
    supabase.from('stock_movements').select('id', { count: 'exact', head: true }).eq('store_id', store.id).eq('kind', 'venda'),
    supabase.from('product_recipe_items').select('product_id').eq('store_id', store.id).not('product_id', 'is', null),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
  ])

  const allItems = items ?? []
  const activeItems = allItems.filter((i) => i.is_active)
  const lowItems = activeItems.filter((i) => stockStatus(i) !== 'ok')
  const itemName = new Map(allItems.map((i) => [i.id, i.name]))
  const costAlerts = (costLines ?? [])
    .map((l) => {
      const next = toNum(l.unit_price_cents) / toNum(l.conversion || 1)
      const pct = costVariationPct(l.prev_cost_cents, next)
      return {
        id: l.id,
        name: itemName.get(l.item_id) || l.description,
        supplier: l.purchase_invoices?.supplier_name,
        prev: toNum(l.prev_cost_cents),
        next,
        pct,
      }
    })
    .filter((a) => a.pct !== null && Math.abs(a.pct) >= COST_ALERT_PCT)

  const alertCount = lowItems.length + costAlerts.length
  const guideStatus = {
    items: activeItems.length,
    entries: entryCount ?? 0,
    sales: saleCount ?? 0,
    products: productCount ?? 0,
    productsWithRecipe: new Set((recipeProducts ?? []).map((r) => r.product_id)).size,
    withMinimum: activeItems.filter((i) => toNum(i.min_quantity) > 0).length,
  }

  return (
    <>
      <div className="dash-header page-head">
        <span className="page-head-ico" aria-hidden><Package size={22} strokeWidth={2} /></span>
        <div>
          <h1 className="dash-title">Estoque</h1>
          <div className="dash-subtitle">Insumos, entrada por nota fiscal e baixa automática pela ficha técnica.</div>
        </div>
      </div>

      <StockGuide status={guideStatus} />

      {alertCount > 0 && (
        <div className="stk-alert" role="status">
          <TriangleAlert size={16} strokeWidth={2.2} aria-hidden />
          <span>
            <strong>{alertCount} {alertCount === 1 ? 'alerta' : 'alertas'}:</strong>{' '}
            {[
              lowItems.length > 0 &&
                `${lowItems.length} ${lowItems.length === 1 ? 'insumo acabando' : 'insumos acabando'}`,
              costAlerts.length > 0 &&
                `${costAlerts.length} ${costAlerts.length === 1 ? 'insumo mudou de preço' : 'insumos mudaram de preço'}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
          {tab !== 'geral' && lowItems.length > 0 && (
            <Link href="/dashboard/estoque?tab=geral&filtro=baixo" className="stk-alert-link">Ver em Meus insumos</Link>
          )}
        </div>
      )}

      <nav className="settings-tabs stk-tabs" aria-label="Seções do estoque">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === 'geral' ? '/dashboard/estoque' : `/dashboard/estoque?tab=${t.key}`}
            className={`settings-tab ${tab === t.key ? 'active' : ''}`}
            aria-current={tab === t.key ? 'page' : undefined}
          >
            <t.Icon size={16} strokeWidth={2} aria-hidden />
            {t.label}
            {t.key === 'notas' && pendingCount > 0 && <span className="stk-count">{pendingCount}</span>}
          </Link>
        ))}
      </nav>
      <p className="stk-intro">{TABS.find((t) => t.key === tab)?.intro}</p>

      {tab === 'geral' && (
        <>
          {costAlerts.length > 0 && <CostAlerts alerts={costAlerts} />}
          <StockItemsTable items={allItems} initialFilter={sp?.filtro === 'baixo' ? 'baixo' : 'ativos'} />
        </>
      )}
      {tab === 'notas' && <NotasTab supabase={supabase} storeId={store.id} status={sp?.status} />}
      {tab === 'movimentacoes' && <MovimentacoesTab supabase={supabase} storeId={store.id} items={allItems} kind={sp?.tipo} />}
      {tab === 'fornecedores' && <FornecedoresTab supabase={supabase} storeId={store.id} />}
      {tab === 'fichas' && <FichasTab supabase={supabase} storeId={store.id} items={activeItems} productId={sp?.produto} />}
    </>
  )
}

async function NotasTab({ supabase, storeId, status }) {
  const filter = ['pendente', 'lancada', 'descartada'].includes(status) ? status : 'pendente'
  const [{ data: invoices }, { data: counts }] = await Promise.all([
    supabase
      .from('purchase_invoices')
      .select('id, supplier_name, supplier_cnpj, number, series, issued_at, total_cents, status, source, launched_at, created_at, purchase_invoice_items(count)')
      .eq('store_id', storeId)
      .eq('status', filter)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('purchase_invoices').select('status').eq('store_id', storeId),
  ])
  const byStatus = { pendente: 0, lancada: 0, descartada: 0 }
  for (const r of counts ?? []) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
  return <InvoicesPanel invoices={invoices ?? []} filter={filter} counts={byStatus} />
}

async function MovimentacoesTab({ supabase, storeId, items, kind }) {
  let q = supabase
    .from('stock_movements')
    .select('id, item_id, kind, quantity, unit_cost_cents, note, order_id, invoice_id, created_at')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (kind) q = q.eq('kind', kind)
  const { data } = await q
  return <MovementsTable movements={data ?? []} items={items} kind={kind || ''} />
}

async function FornecedoresTab({ supabase, storeId }) {
  const { data } = await supabase
    .from('suppliers')
    .select('id, name, cnpj, phone, email, notes, purchase_invoices(total_cents, status, issued_at)')
    .eq('store_id', storeId)
    .order('name')
  return <SuppliersPanel suppliers={data ?? []} />
}

async function FichasTab({ supabase, storeId, items, productId }) {
  const [{ data: products }, { data: recipes }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, price_cents, image_url, is_active, categories(name), product_option_groups(id, name, product_options(id, name, price_delta_cents))')
      .eq('store_id', storeId)
      .order('name'),
    supabase.from('product_recipe_items').select('id, product_id, option_id, item_id, quantity').eq('store_id', storeId),
  ])
  return (
    <RecipesPanel
      products={products ?? []}
      recipes={recipes ?? []}
      items={items}
      selectedId={productId || null}
    />
  )
}
