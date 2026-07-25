import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function darken(hex: string, amount: number) {
  const clean = hex.replace('#', '')
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16)
  const r = Math.max(0, ((num >> 16) & 255) - amount)
  const g = Math.max(0, ((num >> 8) & 255) - amount)
  const b = Math.max(0, (num & 255) - amount)
  return `rgb(${r},${g},${b})`
}

// Ícone PNG "de verdade" por loja. O Chrome no Android só aceita ícones raster (PNG) pra
// instalação da PWA — ícone SVG faz o convite aparecer mas a instalação falhar. Renderizamos
// full-bleed (fundo preenche o quadrado) pra também servir de maskable, sem borda branca.
//
// Quando a loja tem logo, é ELA que vira o ícone do app e o favicon do cardápio. Passar a
// logo direto no manifest não funcionava: o arquivo enviado pode ser JPG/WEBP/SVG e de
// qualquer proporção, enquanto o manifest precisa declarar tipo e tamanho corretos. Ao
// redesenhar aqui, qualquer upload vira um PNG 512×512 quadrado e válido.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: store } = await supabase
    .from('store_public')
    .select('name, theme')
    .eq('slug', slug)
    .maybeSingle()

  const name = store?.name || 'Cardápio'
  const theme = (store?.theme ?? {}) as { primaryColor?: string; logoUrl?: string }
  const color = theme.primaryColor || '#FF5722'
  const dark = darken(color, 45)
  const letter = name.trim().charAt(0).toUpperCase() || 'C'
  const logoUrl = theme.logoUrl?.trim()

  // Cache longo no CDN: o ícone só muda quando a loja troca a logo, e aí a URL do
  // arquivo no Storage também muda — então não há risco de servir ícone velho.
  const headers = { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: `linear-gradient(135deg, ${color}, ${dark})`,
          color: '#ffffff',
          fontSize: 300,
          fontWeight: 800,
          fontFamily: 'sans-serif',
        }}
      >
        {logoUrl ? (
          // `cover` preenche o quadrado mesmo com logo retangular, mantendo o full-bleed
          // que o ícone maskable do Android exige (sem borda branca em volta).
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" width={512} height={512} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          letter
        )}
      </div>
    ),
    { width: 512, height: 512, headers }
  )
}
