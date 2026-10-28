import { NextResponse } from 'next/server'

// Ícone da PWA do painel de leads: sino sobre gradiente laranja da marca + alerta.
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
  <g fill="#ffffff">
    <path d="M256 108c15 0 27 12 27 27v10c53 12 92 60 92 117v46l30 44c6 9-1 20-11 20H285a29 29 0 0 1-58 0H129c-11 0-17-11-11-20l30-44v-46c0-57 39-105 92-117v-10c0-15 12-27 27-27z" fill-opacity="0.97"/>
    <path d="M228 420h56a28 28 0 0 1-56 0z"/>
  </g>
  <circle cx="372" cy="150" r="46" fill="#16181d"/>
  <circle cx="372" cy="150" r="30" fill="#25D366"/>
  <rect x="1.5" y="1.5" width="509" height="509" rx="110.5" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="3"/>
</svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
