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

  const icons = logoUrl
    ? [
        { src: logoUrl, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: logoUrl, sizes: '512x512', type: 'image/png', purpose: 'any' },
      ]
    : [
        { src: '/icons/icon-fallback.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
        { src: '/icons/icon-fallback.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
      ]

  const manifest = {
    name: store.name,
    short_name: store.name.slice(0, 20),
    description: `Peça online na ${store.name}`,
    start_url: `/loja/${store.slug}?pwa=1`,
    scope: `/loja/${store.slug}`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#121212',
    theme_color: primaryColor,
    icons,
  }

  return NextResponse.json(manifest, {
    headers: { 'Content-Type': 'application/manifest+json' },
  })
}
