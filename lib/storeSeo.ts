import { absoluteUrl } from '@/lib/seo'
import { DAY_KEYS, sanitizeOpeningHours, type DayKey } from '@/lib/openingHours'
import { e164 } from '@/lib/phone'

// SEO do cardápio público. É a página que mais tem chance de rankear no Google:
// conteúdo real, local e único ("pizzaria x delivery", "hamburguer bairro y").
// Schema.org Restaurant + Menu é o que habilita os rich results de restaurante.

const SCHEMA_DAY: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

export type SeoProduct = {
  id: string
  name: string
  description: string | null
  price_cents: number
  image_url: string | null
}

export type SeoCategory = {
  id: string
  name: string
  products: SeoProduct[]
}

export type SeoStore = {
  id: string
  slug: string
  name: string
  address: string | null
  whatsapp_number: string | null
  theme: { logoUrl?: string; bannerUrl?: string; primaryColor?: string } | null
  delivery_enabled: boolean
  pickup_enabled: boolean
  dine_in_enabled: boolean
  delivery_fee_cents: number
  min_order_cents: number
  accepts_pix: boolean
  accepts_card: boolean
  accepts_cash: boolean
  opening_hours?: unknown
}

const brl = (cents: number) => (cents / 100).toFixed(2)

/**
 * Normaliza o WhatsApp para E.164 (+55DDNNNNNNNNN). Devolve undefined quando o
 * número é curto ou incompleto — telefone inválido no schema é pior que ausente:
 * o Google pode descartar o bloco todo por dado inconsistente.
 */
/** Lista legível dos modos de entrega — usada na description e no schema. */
export function serviceLabels(store: Pick<SeoStore, 'delivery_enabled' | 'pickup_enabled' | 'dine_in_enabled'>) {
  const out: string[] = []
  if (store.delivery_enabled) out.push('delivery')
  if (store.pickup_enabled) out.push('retirada no local')
  if (store.dine_in_enabled) out.push('consumo no local')
  return out
}

/**
 * Descrição do cardápio (~155 caracteres). Montada a partir dos dados reais da
 * loja para que cada página tenha texto único — descrição duplicada entre lojas
 * faria o Google indexar só uma delas.
 */
export function storeDescription(store: SeoStore, categories: SeoCategory[]): string {
  const services = serviceLabels(store)
  const parts = [`Peça online no cardápio digital do ${store.name}.`]

  const highlights = categories
    .filter((c) => c.products.length > 0)
    .slice(0, 4)
    .map((c) => c.name.toLowerCase())
  if (highlights.length) parts.push(`${highlights.join(', ')} e mais.`)

  if (services.length) parts.push(`Com ${services.join(', ')}.`)
  if (store.address) parts.push(store.address)

  const payments: string[] = []
  if (store.accepts_pix) payments.push('Pix')
  if (store.accepts_card) payments.push('cartão')
  if (store.accepts_cash) payments.push('dinheiro')
  if (payments.length) parts.push(`Pague com ${payments.join(', ')}.`)

  return parts.join(' ').slice(0, 300)
}

/** Palavras-chave de cauda longa com o nome da loja (busca de marca). */
export function storeKeywords(store: SeoStore, categories: SeoCategory[]): string[] {
  const base = [
    `${store.name} delivery`,
    `${store.name} cardápio`,
    `${store.name} peça online`,
    `${store.name} menu`,
    'cardápio digital',
    'pedido online',
  ]
  const cats = categories.slice(0, 5).map((c) => `${c.name} ${store.name}`)
  return [...base, ...cats]
}

function openingHoursSchema(raw: unknown) {
  const hours = sanitizeOpeningHours(raw)
  const specs = DAY_KEYS.flatMap((day) =>
    hours[day].map((range) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${SCHEMA_DAY[day]}`,
      opens: range.open,
      closes: range.close,
    }))
  )
  return specs.length ? specs : undefined
}

/**
 * `Restaurant` com o menu completo aninhado. O menu vai como `hasMenu` → seções →
 * itens com preço: é o que permite ao Google mostrar pratos e faixa de preço.
 */
export function storeSchema(store: SeoStore, categories: SeoCategory[]) {
  const url = absoluteUrl(`/loja/${store.slug}`)
  const logo = store.theme?.logoUrl?.trim()
  const banner = store.theme?.bannerUrl?.trim()
  const images = [banner, logo].filter(Boolean) as string[]

  const sections = categories
    .filter((c) => c.products.length > 0)
    .map((c) => ({
      '@type': 'MenuSection',
      name: c.name,
      hasMenuItem: c.products.map((p) => ({
        '@type': 'MenuItem',
        name: p.name,
        ...(p.description ? { description: p.description } : {}),
        ...(p.image_url ? { image: p.image_url } : {}),
        offers: {
          '@type': 'Offer',
          price: brl(p.price_cents),
          priceCurrency: 'BRL',
          availability: 'https://schema.org/InStock',
        },
      })),
    }))

  const prices = categories.flatMap((c) => c.products.map((p) => p.price_cents)).filter((n) => n > 0)

  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `${url}#restaurant`,
    name: store.name,
    url,
    ...(images.length ? { image: images } : {}),
    ...(logo ? { logo } : {}),
    ...(e164(store.whatsapp_number) ? { telephone: e164(store.whatsapp_number) } : {}),
    ...(store.address
      ? { address: { '@type': 'PostalAddress', streetAddress: store.address, addressCountry: 'BR' } }
      : {}),
    ...(openingHoursSchema(store.opening_hours)
      ? { openingHoursSpecification: openingHoursSchema(store.opening_hours) }
      : {}),
    currenciesAccepted: 'BRL',
    paymentAccepted: [
      store.accepts_pix && 'Pix',
      store.accepts_card && 'Cartão de crédito',
      store.accepts_cash && 'Dinheiro',
    ]
      .filter(Boolean)
      .join(', '),
    // Faixa de preço em $ — o Google usa isso no card do restaurante.
    ...(prices.length
      ? { priceRange: '$'.repeat(Math.min(4, Math.max(1, Math.ceil(Math.min(...prices) / 100 / 25)))) }
      : {}),
    hasDeliveryMethod: [
      store.delivery_enabled && 'https://purl.org/goodrelations/v1#DeliveryModeOwnFleet',
      store.pickup_enabled && 'http://purl.org/goodrelations/v1#DeliveryModePickUp',
    ].filter(Boolean),
    acceptsReservations: false,
    ...(sections.length
      ? {
          hasMenu: {
            '@type': 'Menu',
            name: `Cardápio ${store.name}`,
            url,
            inLanguage: 'pt-BR',
            hasMenuSection: sections,
          },
        }
      : {}),
    potentialAction: {
      '@type': 'OrderAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: url,
        actionPlatform: [
          'https://schema.org/DesktopWebPlatform',
          'https://schema.org/MobileWebPlatform',
        ],
      },
      deliveryMethod: store.delivery_enabled
        ? 'https://purl.org/goodrelations/v1#DeliveryModeOwnFleet'
        : 'http://purl.org/goodrelations/v1#DeliveryModePickUp',
    },
  }
}
