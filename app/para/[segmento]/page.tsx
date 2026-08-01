import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import '../../landing.css'
import LandingPricing from '@/components/landing/LandingPricing'
import LandingFinalCta from '@/components/landing/LandingFinalCta'
import LandingFooter from '@/components/landing/LandingFooter'
import { getSegment, SEGMENTS } from '@/lib/segments'
import { absoluteUrl, breadcrumbSchema, faqSchema, jsonLd, SITE_NAME } from '@/lib/seo'

// Páginas estáticas geradas em build: HTML pronto no CDN, sem query no banco.
// Peso zero de servidor e o melhor TTFB possível — que é sinal de ranking.
export const dynamicParams = false

export function generateStaticParams() {
  return SEGMENTS.map((s) => ({ segmento: s.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ segmento: string }>
}): Promise<Metadata> {
  const { segmento } = await params
  const seg = getSegment(segmento)
  if (!seg) return {}

  const url = absoluteUrl(`/para/${seg.slug}`)
  return {
    title: seg.metaTitle,
    description: seg.metaDescription,
    keywords: seg.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: `${seg.metaTitle} — ${SITE_NAME}`,
      description: seg.metaDescription,
    },
  }
}

export default async function SegmentoPage({
  params,
}: {
  params: Promise<{ segmento: string }>
}) {
  const { segmento } = await params
  const seg = getSegment(segmento)
  if (!seg) notFound()

  const others = SEGMENTS.filter((s) => s.slug !== seg.slug)

  return (
    <div className="landing dark">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebPage',
                '@id': `${absoluteUrl(`/para/${seg.slug}`)}#webpage`,
                url: absoluteUrl(`/para/${seg.slug}`),
                name: seg.metaTitle,
                description: seg.metaDescription,
                inLanguage: 'pt-BR',
                isPartOf: { '@id': absoluteUrl('/#website') },
                about: { '@id': absoluteUrl('/#software') },
              },
              faqSchema(seg.faqs),
              breadcrumbSchema([
                { name: 'Início', path: '/' },
                { name: seg.metaTitle, path: `/para/${seg.slug}` },
              ]),
            ],
          }),
        }}
      />

      <header className="l-nav">
        <Link href="/" className="l-logo">
          cardápio<em>hub</em>
        </Link>
        <Link href="/contato" className="l-btn-primary">Quero minha loja no ar</Link>
      </header>

      <section className="l-hero">
        <div className="l-hero-grid">
          <div>
            <span className="l-tag">sem taxa por pedido</span>
            <h1 className="l-h1">{seg.h1}</h1>
            <p className="l-hero-sub">{seg.intro}</p>
            <div className="l-hero-ctas">
              <Link href="/contato" className="l-btn-primary large">
                Quero minha {seg.label} no ar
              </Link>
              <a href="#planos" className="l-hero-link">ou veja os planos ↓</a>
            </div>
            <p className="l-hero-trust">sem cartão de crédito · a gente configura junto com você</p>
          </div>

          <div className="l-mockup-wrap">
            <Image
              src="/marketing/phone-cutout.png"
              alt={`Cardápio digital de ${seg.label} aberto no celular`}
              width={896}
              height={1200}
              className="l-mockup-photo"
              priority
            />
          </div>
        </div>
      </section>

      <div className="l-perforation" />

      <section className="l-section">
        <div className="l-section-head">
          <div className="l-eyebrow">Feito pra {seg.label}</div>
          <h2 className="l-h2">O que trava hoje na sua {seg.label}</h2>
        </div>
        <div className="l-pains-grid">
          {seg.pains.map((p, i) => (
            <div className="l-feature-card" key={p.title}>
              <div className="l-feature-num">{String(i + 1).padStart(2, '0')}</div>
              <div className="l-feature-title">{p.title}</div>
              <div className="l-feature-desc">{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="l-perforation" />

      <section className="l-section tight">
        <div className="l-section-head">
          <div className="l-eyebrow">Como fica no dia a dia</div>
          <h2 className="l-h2">Da montagem do cardápio ao fechamento do caixa</h2>
        </div>
        {/* `.l-section` não limita a largura (quem faz isso na home é
            `.l-steps-layout`, que aqui não usamos por não ter a foto ao lado). */}
        <div className="l-steps" style={{ maxWidth: 760, margin: '0 auto' }}>
          {seg.steps.map((s, i) => (
            <div className="l-step" key={s}>
              <div className="l-step-num">{String(i + 1).padStart(2, '0')}</div>
              <div>
                <div className="l-step-desc">{s}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div id="planos" />
      <LandingPricing />

      <section className="l-section tight">
        <div className="l-section-head">
          <div className="l-eyebrow">Dúvidas frequentes</div>
          <h2 className="l-h2">Perguntas de quem tem {seg.label}</h2>
        </div>
        <div className="l-faq">
          {seg.faqs.map((f) => (
            <details className="l-faq-item" key={f.q}>
              <summary>{f.q}</summary>
              <p className="l-faq-answer">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Links internos entre os segmentos: distribui autoridade e dá ao Google
          um caminho pra descobrir e reindexar todas as páginas do conjunto. */}
      <section className="l-section tight">
        <div className="l-section-head">
          <div className="l-eyebrow">Outros segmentos</div>
          <h2 className="l-h2">Também funciona para</h2>
        </div>
        <nav className="l-segment-links">
          {others.map((o) => (
            <Link key={o.slug} href={`/para/${o.slug}`}>
              Cardápio digital para {o.label}
            </Link>
          ))}
        </nav>
      </section>

      <LandingFinalCta />
      <LandingFooter />
    </div>
  )
}
