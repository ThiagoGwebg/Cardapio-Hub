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

  // Todos os ícones saem da rota PNG, que já desenha a logo da loja (ou a inicial, se não
  // houver logo) num quadrado 512×512. Antes o manifest apontava a logo crua: como o upload
  // pode ser JPG/WEBP/SVG e de qualquer proporção, o `type`/`sizes` declarado ficava errado
  // e o Chrome descartava o ícone na hora de instalar a PWA.
  const icon = `/loja/${slug}/app-icon.png`
  const icons = [
    { src: icon, sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: icon, sizes: '512x512', type: 'image/png', purpose: 'any' },
    // Full-bleed (o desenho preenche o quadrado), então serve de maskable sem borda branca.
    { src: icon, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
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
    // Só "standalone" — "minimal-ui" faz o Chrome mostrar aquela barra com o "✕" e a URL
    // por cima do app quando ele decide usar o modo alternativo em vez do standalone puro.
    display: 'standalone',
    display_override: ['standalone'],
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
