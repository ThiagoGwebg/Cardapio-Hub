import { NextResponse } from 'next/server'

// Manifest da PWA do painel admin inteiro (visão geral, leads e lojas).
// start_url aponta pros leads pra já abrir na tela de alertas de novos leads.
export function GET() {
  const manifest = {
    name: 'CardápioÁgil · Painel',
    short_name: 'Painel',
    description: 'Painel do time CardápioÁgil — leads, lojas e visão geral.',
    start_url: '/admin/leads?pwa=1',
    scope: '/admin',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0c11',
    theme_color: '#0a0c11',
    icons: [
      { src: '/admin/app-icon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
      { src: '/admin/app-icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
      { src: '/admin/app-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }

  return NextResponse.json(manifest, {
    headers: { 'Content-Type': 'application/manifest+json' },
  })
}
