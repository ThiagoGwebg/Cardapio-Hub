import Link from 'next/link'

export default function Home() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 24,
        gap: 20,
      }}
    >
      <h1
        style={{
          fontFamily: 'Nunito, sans-serif',
          fontWeight: 900,
          fontSize: 40,
        }}
      >
        cardápio<span style={{ color: 'var(--primary)' }}>ágil</span>
      </h1>
      <p style={{ color: 'var(--muted)', maxWidth: 480, fontSize: 15 }}>
        Cardápio digital, pedidos e painel de gestão pro seu negócio. Fácil de usar, preço
        baixo, e com a cara da sua loja.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link href="/signup" className="new-order-btn">
          Criar minha loja
        </Link>
        <Link
          href="/login"
          style={{
            padding: '9px 18px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            color: 'var(--text2)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Entrar
        </Link>
      </div>
    </div>
  )
}
