import { NextResponse } from 'next/server'

// Manifest da PWA do painel do lojista — permite instalar o painel de pedidos como
// app e é pré-requisito pro Chrome/Android oferecerem o beforeinstallprompt.
export function GET() {
  const manifest = {
    name: 'Cardápio Hub · Painel',
    short_name: 'Painel',
    description: 'Gerencie pedidos, cardápio e sua loja no Cardápio Hub.',
    start_url: '/dashboard?pwa=1',
    scope: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F6F6F8',
    theme_color: '#FF5722',
    icons: [
      { src: '/dashboard/app-icon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
      { src: '/dashboard/app-icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
      { src: '/dashboard/app-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }

  return NextResponse.json(manifest, {
    headers: { 'Content-Type': 'application/manifest+json' },
  })
}
