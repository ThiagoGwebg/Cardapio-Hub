import { NextResponse } from 'next/server'

// Manifest da PWA do painel de leads — permite "adicionar à tela inicial" no celular
// e abrir em modo standalone (cara de app).
export function GET() {
  const manifest = {
    name: 'Leads · CardápioÁgil',
    short_name: 'Leads',
    description: 'Painel de leads do CardápioÁgil — acompanhe quem pediu contato.',
    start_url: '/admin/leads?pwa=1',
    scope: '/admin/leads',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#14161b',
    theme_color: '#14161b',
    icons: [
      { src: '/admin/leads/app-icon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
      { src: '/admin/leads/app-icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
      { src: '/admin/leads/app-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }

  return NextResponse.json(manifest, {
    headers: { 'Content-Type': 'application/manifest+json' },
  })
}
