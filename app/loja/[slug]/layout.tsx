import type { Metadata, Viewport } from 'next'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// Busca só o necessário pro <head> (nome + tema). Cacheada por request pra generateMetadata
// e generateViewport não baterem duas vezes no banco.
const getStoreHead = cache(async (slug: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('store_public')
    .select('name, slug, theme')
    .eq('slug', slug)
    .maybeSingle()
  return data as { name: string; slug: string; theme: { primaryColor?: string; logoUrl?: string } | null } | null
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const store = await getStoreHead(slug)
  const name = store?.name || 'Cardápio'
  // Mesma rota do ícone da PWA: entrega a logo da loja já quadrada em PNG 512×512.
  // Usar `theme.logoUrl` direto deixava o favicon torto quando a logo não era quadrada,
  // e o apple-touch-icon do iPhone exige PNG quadrado.
  const icon = `/loja/${slug}/app-icon.png`

  return {
    title: name,
    applicationName: name,
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
