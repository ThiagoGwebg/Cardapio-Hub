import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function darken(hex: string, amount: number) {
  const clean = hex.replace('#', '')
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16)
  const r = Math.max(0, ((num >> 16) & 255) - amount)
  const g = Math.max(0, ((num >> 8) & 255) - amount)
  const b = Math.max(0, (num & 255) - amount)
  return `rgb(${r},${g},${b})`
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: store } = await supabase
    .from('store_public')
    .select('name, theme')
    .eq('slug', slug)
    .maybeSingle()

  const name = store?.name || 'Cardápio'
  const theme = (store?.theme ?? {}) as { primaryColor?: string }
  const color = theme.primaryColor || '#FF5722'
  const dark = darken(color, 45)
  const letter = name.trim().charAt(0).toUpperCase() || 'C'

  const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${color}"/>
      <stop offset="100%" stop-color="${dark}"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="55%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <rect width="512" height="512" rx="112" fill="url(#shine)"/>
  <text x="256" y="298" text-anchor="middle" font-family="'Nunito','Segoe UI',system-ui,sans-serif" font-weight="800" font-size="240" fill="#ffffff" fill-opacity="0.96">${letter}</text>
  <rect x="1.5" y="1.5" width="509" height="509" rx="110.5" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="3"/>
</svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
