import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/seo'

// Bloqueia o que não deve gastar crawl budget nem aparecer na busca:
// áreas logadas, APIs e o acompanhamento de pedido (URL com id, conteúdo privado).
const PRIVATE_PATHS = [
  '/admin',
  '/dashboard',
  '/api/',
  '/login',
  '/signup',
  '/pedido/',
  '/~offline',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  }
}
