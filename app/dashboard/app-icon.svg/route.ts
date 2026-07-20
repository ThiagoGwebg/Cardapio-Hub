import { NextResponse } from 'next/server'

// Ícone da PWA do painel do lojista (Admin): mesmo raio de marca do painel interno,
// pra manter a identidade Cardápio Hub em qualquer tela de instalação.
export function GET() {
  const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FF7A45"/>
      <stop offset="100%" stop-color="#E64A19"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="55%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <rect width="512" height="512" rx="112" fill="url(#shine)"/>
  <polygon points="270,116 130,284 256,284 242,396 382,228 256,228" fill="#ffffff" fill-opacity="0.98"/>
  <rect x="1.5" y="1.5" width="509" height="509" rx="110.5" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="3"/>
</svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
