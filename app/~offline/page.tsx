// Fallback offline do PWA (Admin e Loja Pública) — o next-pwa serve esta página
// pré-cacheada no lugar do "sem internet" nativo do navegador. Estilo inline e
// autocontido de propósito: precisa renderizar bem mesmo sem o CSS global em cache.
// Sem 'use client': o link de "tentar de novo" é uma navegação normal (<a href>),
// então a página continua um Server Component simples e pode exportar metadata.

export const metadata = {
  title: 'Sem conexão · Cardápio Hub',
  robots: { index: false, follow: false },
}

export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#121212',
        color: '#F4F4F5',
        fontFamily: "'Nunito', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ maxWidth: 360, textAlign: 'center' }}>
        <div
          style={{
            width: 72,
            height: 72,
            margin: '0 auto 20px',
            borderRadius: 20,
            background: 'rgba(255, 87, 34, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 34,
          }}
        >
          📡
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>Você está offline</h1>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: '#A1A1AA', margin: '0 0 24px' }}>
          Sem conexão com a internet no momento. Assim que a rede voltar, é só tentar de novo — o
          que você já tinha aberto continua salvo.
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            background: '#FF5722',
            color: '#fff',
            borderRadius: 12,
            padding: '12px 28px',
            fontWeight: 800,
            fontSize: 14,
            fontFamily: 'inherit',
            textDecoration: 'none',
          }}
        >
          Tentar novamente
        </a>
      </div>
    </div>
  )
}
