import type { Metadata, Viewport } from 'next'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { absoluteUrl } from '@/lib/seo'
import { serviceLabels, storeDescription, storeKeywords, type SeoStore } from '@/lib/storeSeo'

// Busca só o necessário pro <head> (nome, tema e campos de SEO). Cacheada por request
// pra generateMetadata e generateViewport não baterem duas vezes no banco.
const getStoreHead = cache(async (slug: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('store_public')
    .select(
      'id, name, slug, theme, address, whatsapp_number, delivery_enabled, pickup_enabled, dine_in_enabled, delivery_fee_cents, min_order_cents, accepts_pix, accepts_card, accepts_cash, opening_hours'
    )
    .eq('slug', slug)
    .maybeSingle()
  return data as SeoStore | null
})

// Conta produtos ativos com `head: true` (não traz linhas, só o total) — barato o
// suficiente pra rodar no <head>. Loja com cardápio vazio sai do índice: página sem
// conteúdo indexada é thin content e prejudica o domínio todo.
const countActiveProducts = cache(async (storeId: string) => {
  const supabase = await createClient()
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('is_active', true)
  return count ?? 0
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const store = await getStoreHead(slug)
  const name = store?.name || 'Cardápio'
  const canonical = absoluteUrl(`/loja/${slug}`)
  // Descrição montada só com os campos da loja (sem carregar o cardápio): evita uma
  // segunda query no banco só pro <head>. O texto continua único por loja.
  const description = store
    ? storeDescription(store, [])
    : 'Cardápio digital para pedir online.'
  // Título com a intenção de busca real do cliente ("<loja> delivery"), não só o nome.
  const services = store ? serviceLabels(store) : []
  const titleSuffix = services.includes('delivery') ? 'Delivery e Cardápio Online' : 'Cardápio Online'
  // Mesma rota do ícone da PWA: entrega a logo da loja já quadrada em PNG 512×512.
  // Usar `theme.logoUrl` direto deixava o favicon torto quando a logo não era quadrada,
  // e o apple-touch-icon do iPhone exige PNG quadrado.
  const icon = `/loja/${slug}/app-icon.png`
  const hasMenu = store ? (await countActiveProducts(store.id)) > 0 : false

  return {
    // `absolute` de propósito: o template do layout raiz acrescentaria
    // "— Cardápio Hub" na aba de TODA loja, o que quebra o white-label do plano Pro.
    title: { absolute: `${name} — ${titleSuffix}` },
    description,
    keywords: store ? storeKeywords(store, []) : undefined,
    applicationName: name,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: name,
      locale: 'pt_BR',
      title: `${name} — ${titleSuffix}`,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} — ${titleSuffix}`,
      description,
    },
    robots: {
      index: hasMenu,
      follow: true,
      googleBot: { index: hasMenu, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    manifest: `/loja/${slug}/manifest.webmanifest`,
    // Faz o iPhone abrir em tela cheia (sem a barra de URL) depois de "Adicionar à Tela de Início".
    // Sem isto o iOS ignora o display:standalone do manifest.
    appleWebApp: {
      capable: true,
      title: name,
      statusBarStyle: 'black-translucent',
    },
    // `sizes`/`type` explícitos são necessários: o Next injeta o favicon.ico global do
    // Cardápio Hub em toda rota, declarado como 256×256. Sem tamanho declarado aqui, o
    // navegador podia preferir o ícone global e ignorar a logo da loja na aba.
    icons: {
      icon: [{ url: icon, sizes: '512x512', type: 'image/png' }],
      shortcut: [{ url: icon, sizes: '512x512', type: 'image/png' }],
      // A rota entrega 512×512; declarar o tamanho real evita mentir pro iOS, que
      // reduz sozinho para o tamanho da tela de início.
      apple: [{ url: icon, sizes: '512x512', type: 'image/png' }],
    },
    other: {
      // O Next já emite `mobile-web-app-capable` (moderno) via appleWebApp.capable.
      // Aqui garantimos a tag prefixada `apple-*`, que o Safari do iPhone lê pra abrir
      // em tela cheia (sem barra de URL) — inclusive em iOS mais antigos.
      'apple-mobile-web-app-capable': 'yes',
    },
  }
}

export async function generateViewport({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Viewport> {
  const { slug } = await params
  const store = await getStoreHead(slug)
  const primary = store?.theme?.primaryColor || '#FF5722'

  return {
    themeColor: primary,
    // Deixa o conteúdo usar a área do notch; o safe-area no CSS cuida do respiro.
    viewportFit: 'cover',
    width: 'device-width',
    initialScale: 1,
  }
}

export default function LojaLayout({ children }: { children: React.ReactNode }) {
  return children
}
