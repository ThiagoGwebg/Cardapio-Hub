import type { Metadata } from 'next'
import LandingShell from '@/components/landing/LandingShell'
import { FAQS } from '@/components/landing/LandingFaq'
import {
  absoluteUrl,
  faqSchema,
  jsonLd,
  organizationSchema,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
  softwareApplicationSchema,
  websiteSchema,
} from '@/lib/seo'

export const metadata: Metadata = {
  // `absolute` para a home não virar "… — Cardápio Hub — Cardápio Hub" pelo template.
  title: { absolute: `${SITE_NAME} — ${SITE_TITLE}` },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  alternates: { canonical: absoluteUrl('/') },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/'),
    title: `${SITE_NAME} — ${SITE_TITLE}`,
    description: SITE_DESCRIPTION,
  },
}

export default function Home() {
  return (
    <>
      {/* Um único bloco de JSON-LD com @graph: menos bytes e as entidades já
          referenciadas entre si pelos @id (organização ↔ site ↔ software). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            '@context': 'https://schema.org',
            '@graph': [
              organizationSchema(),
              websiteSchema(),
              softwareApplicationSchema(),
              faqSchema(FAQS),
            ],
          }),
        }}
      />
      <LandingShell />
    </>
  )
}
