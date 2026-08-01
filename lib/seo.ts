import { getBaseUrl } from '@/lib/baseUrl'

// Fonte única de verdade do SEO institucional (marca, textos padrão e JSON-LD).
// Metadata de páginas deve importar daqui em vez de repetir strings soltas —
// título, descrição e Open Graph precisam bater com o que o Google indexa.

export const SITE_NAME = 'Cardápio Hub'

/** Título da home. Curto o bastante pra não ser truncado na SERP (~60 caracteres). */
export const SITE_TITLE = 'Cardápio digital e sistema de pedidos sem comissão'

/** Descrição da home (~155 caracteres, o limite prático do snippet do Google). */
export const SITE_DESCRIPTION =
  'Monte seu cardápio digital com QR Code, receba pedidos direto no painel e não pague comissão por venda. A partir de R$ 29/mês, sem cartão de crédito.'

export const SITE_KEYWORDS = [
  'cardápio digital',
  'cardápio digital com QR Code',
  'sistema de pedidos para restaurante',
  'delivery próprio sem comissão',
  'cardápio online para lanchonete',
  'sistema para pizzaria',
  'gestão de pedidos e caixa',
  'cardápio digital grátis para testar',
]

export const SITE_LOCALE = 'pt_BR'

/**
 * Códigos de verificação de propriedade do site.
 *
 * Cole o código aqui e faça push — não precisa mexer em env var no painel da
 * Vercel. O que o Google pede é só o valor do atributo `content`, não a tag
 * inteira: de `<meta name="google-site-verification" content="AbC123..." />`,
 * cole apenas `AbC123...`.
 *
 * Onde pegar: search.google.com/search-console → Adicionar propriedade →
 * "Prefixo do URL" → https://www.cardapiohub.com → método "Tag HTML".
 *
 * A env var (NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION) continua tendo prioridade,
 * pra quem preferir configurar por lá.
 */
export const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() || ''

/** Mesma ideia para o Bing Webmaster Tools (msvalidate.01). Opcional. */
export const BING_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim() || ''

/** Preço de entrada, usado no schema de oferta e nos textos de marketing. */
export const ENTRY_PRICE_BRL = 29

/** Resolve um caminho relativo para URL absoluta (canonical, OG, JSON-LD). */
export function absoluteUrl(path = '/'): string {
  const base = getBaseUrl().replace(/\/$/, '')
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Serializa JSON-LD de forma segura para injetar em <script type="application/ld+json">.
 * Escapa `<` para que um nome de loja com HTML não consiga fechar a tag.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

/** Organização + produto SaaS: alimenta o Knowledge Panel e o card de marca. */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': absoluteUrl('/#organization'),
    name: SITE_NAME,
    url: absoluteUrl('/'),
    logo: absoluteUrl('/icon.svg'),
    image: absoluteUrl('/opengraph-image'),
    description: SITE_DESCRIPTION,
    slogan: 'Do balcão pro celular do seu cliente.',
    areaServed: { '@type': 'Country', name: 'Brasil' },
    knowsLanguage: 'pt-BR',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      availableLanguage: ['Portuguese'],
      url: absoluteUrl('/contato'),
    },
  }
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': absoluteUrl('/#website'),
    url: absoluteUrl('/'),
    name: SITE_NAME,
    inLanguage: 'pt-BR',
    publisher: { '@id': absoluteUrl('/#organization') },
  }
}

/**
 * SoftwareApplication com as duas ofertas. É o schema que habilita os rich
 * results de preço em buscas do tipo "quanto custa cardápio digital".
 */
export function softwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': absoluteUrl('/#software'),
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Cardápio digital e gestão de pedidos',
    operatingSystem: 'Web, Android, iOS',
    url: absoluteUrl('/'),
    description: SITE_DESCRIPTION,
    inLanguage: 'pt-BR',
    publisher: { '@id': absoluteUrl('/#organization') },
    featureList: [
      'Cardápio digital com link próprio e QR Code',
      'Pedidos em tempo real no painel',
      'Controle de caixa e relatórios de desempenho',
      'Pagamento por Pix, cartão e dinheiro',
      'Notificações de pedido por WhatsApp',
      'Sem comissão por venda',
    ],
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'BRL',
      lowPrice: ENTRY_PRICE_BRL,
      offerCount: 2,
      offers: [
        {
          '@type': 'Offer',
          name: 'Lite',
          price: ENTRY_PRICE_BRL,
          priceCurrency: 'BRL',
          description: 'Até 30 produtos e 60 pedidos por mês, sem comissão por venda.',
          url: absoluteUrl('/#pricing'),
          availability: 'https://schema.org/InStock',
        },
        {
          '@type': 'Offer',
          name: 'Pro',
          priceCurrency: 'BRL',
          description:
            'Produtos e pedidos ilimitados, marca própria sem selo, CRM, relatórios avançados e notificações por WhatsApp.',
          url: absoluteUrl('/contato'),
          availability: 'https://schema.org/InStock',
        },
      ],
    },
  }
}

/** FAQPage — pode render o acordeão de perguntas direto na SERP. */
export function faqSchema(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': absoluteUrl('/#faq'),
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}
