import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { serviceLabels, type SeoStore } from '@/lib/storeSeo'

export const runtime = 'nodejs'
export const alt = 'Cardápio online'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Prévia de compartilhamento do cardápio, com a cara da loja (logo + cor do tema).
// O lojista manda esse link no WhatsApp e no Instagram todo dia — um card bonito com
// o nome da loja converte muito mais que a URL crua, e não custa nada pra ele.
function darken(hex: string, amount: number) {
  const clean = hex.replace('#', '')
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16)
  const r = Math.max(0, ((num >> 16) & 255) - amount)
  const g = Math.max(0, ((num >> 8) & 255) - amount)
  const b = Math.max(0, (num & 255) - amount)
  return `rgb(${r},${g},${b})`
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('store_public')
    .select('name, theme, address, delivery_enabled, pickup_enabled, dine_in_enabled')
    .eq('slug', slug)
    .maybeSingle()

  const store = data as (Partial<SeoStore> & { theme: { primaryColor?: string; logoUrl?: string } | null }) | null
  const name = store?.name || 'Cardápio'
  const color = store?.theme?.primaryColor || '#FF5722'
  const logoUrl = store?.theme?.logoUrl?.trim()
  const services = serviceLabels({
    delivery_enabled: !!store?.delivery_enabled,
    pickup_enabled: !!store?.pickup_enabled,
    dine_in_enabled: !!store?.dine_in_enabled,
  })

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '72px 80px',
          backgroundImage: `linear-gradient(135deg, ${color}, ${darken(color, 70)})`,
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            width={148}
            height={148}
            style={{
              width: 148,
              height: 148,
              borderRadius: 28,
              objectFit: 'cover',
              border: '4px solid rgba(255,255,255,0.85)',
            }}
          />
        ) : null}

        <div
          style={{
            marginTop: logoUrl ? 34 : 0,
            fontSize: 78,
            fontWeight: 800,
            letterSpacing: -2.5,
            lineHeight: 1.05,
            maxWidth: 1000,
          }}
        >
          {name}
        </div>

        {/* Uma string só: o Satori exige `display` explícito em elemento com mais
            de um filho, e misturar texto com interpolação criaria dois nós. */}
        <div style={{ marginTop: 20, fontSize: 36, opacity: 0.92 }}>
          {`Cardápio online${services.length ? ` · ${services.join(' · ')}` : ''}`}
        </div>

        {store?.address ? (
          <div style={{ marginTop: 12, fontSize: 28, opacity: 0.78 }}>{store.address}</div>
        ) : null}

        <div
          style={{
            marginTop: 'auto',
            alignSelf: 'flex-start',
            display: 'flex',
            padding: '14px 26px',
            borderRadius: 999,
            background: 'rgba(0,0,0,0.28)',
            fontSize: 30,
            fontWeight: 700,
          }}
        >
          Peça pelo cardápio digital →
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  )
}
