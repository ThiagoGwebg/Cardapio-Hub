import type { Metadata } from 'next'
import Link from 'next/link'
import './landing.css'
import { IconUtensils } from '@/components/icons'

export const metadata: Metadata = {
  title: 'Página não encontrada',
  description: 'A página que você tentou acessar não existe ou foi movida.',
  // Sem indexação: URL quebrada não deve competir por ranking com a home.
  robots: { index: false, follow: false },
}

// Cobre qualquer rota não encontrada no site (marketing, painel, auth). O cardápio
// público (/loja/[slug]) tem sua própria versão em app/loja/[slug]/not-found.tsx —
// essa aqui nunca deve aparecer pro cliente final de uma loja.
export default function NotFound() {
  return (
    <div className="landing">
      <header className="l-nav">
        <Link href="/" className="l-logo">
          cardápio<em>hub</em>
        </Link>
      </header>

      <div
        className="l-container"
        style={{
          minHeight: 'calc(100dvh - 65px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 14,
          padding: '48px 24px',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--primary-l)',
            color: 'var(--primary)',
            marginBottom: 6,
          }}
        >
          <IconUtensils size={30} />
        </div>

        <div className="l-eyebrow">Erro 404</div>
        <h1 className="l-h2" style={{ margin: 0 }}>
          Essa página saiu do cardápio
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.6, maxWidth: 420 }}>
          O endereço que você tentou acessar não existe ou foi movido. Confira o link ou
          volte para o início.
        </p>

        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/" className="l-btn-primary">
            Voltar para o início
          </Link>
          <Link href="/contato" className="l-btn-ghost">
            Falar com a gente
          </Link>
        </div>
      </div>
    </div>
  )
}
