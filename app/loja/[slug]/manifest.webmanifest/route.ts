import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: store } = await supabase
    .from('store_public')
    .select('name, slug, theme')
    .eq('slug', slug)
    .maybeSingle()

  if (!store) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const theme = (store.theme ?? {}) as { primaryColor?: string; logoUrl?: string }
  const primaryColor = theme.primaryColor || '#FF5722'
  const logoUrl = theme.logoUrl

  const generatedIcon = `/loja/${slug}/app-icon.svg`
  // O ícone gerado é "full-bleed" (fundo colorido preenche o quadrado), então serve de maskable
  // no Android e evita a borda branca em volta do logo do cliente.
  const icons = logoUrl
    ? [
        { src: logoUrl, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: logoUrl, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: generatedIcon, sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
      ]
    : [
        { src: generatedIcon, sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
        { src: generatedIcon, sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
        { src: generatedIcon, sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
      ]

  const manifest = {
    id: `/loja/${store.slug}`,
    name: store.name,
    short_name: store.name.slice(0, 20),
    description: `Peça online na ${store.name}`,
    lang: 'pt-BR',
    dir: 'ltr',
    categories: ['food', 'shopping'],
    start_url: `/loja/${store.slug}?pwa=1`,
    scope: `/loja/${store.slug}`,
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait',
    // Splash claro combinando com o cardápio (antes era escuro e piscava preto ao abrir).
    background_color: '#ffffff',
    theme_color: primaryColor,
    prefer_related_applications: false,
    icons,
  }

  return NextResponse.json(manifest, {
    headers: { 'Content-Type': 'application/manifest+json' },
  })
}
