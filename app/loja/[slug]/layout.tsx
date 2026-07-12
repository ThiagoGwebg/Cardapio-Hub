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
  const icon = store?.theme?.logoUrl || `/loja/${slug}/app-icon.svg`

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
    icons: {
      icon,
      shortcut: icon,
      apple: icon,
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
