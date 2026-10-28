import Link from 'next/link'
import { IconUtensils } from '@/components/icons'

/**
 * 404 do cardápio público — cai aqui quando `notFound()` roda em page.tsx por slug
 * inexistente (ver app/loja/[slug]/page.tsx). not-found.tsx não recebe `params`, então
 * não dá pra citar o slug/nome da loja aqui; ver StoreUnavailable.tsx pro caso irmão
 * (loja existe mas está com mensalidade suspensa).
 */
export default function StoreNotFound() {
  return (
    <div className="storefront storefront-light">
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '32px 24px',
          gap: 12,
        }}
      >
        <div style={{ color: 'var(--accent, #FF5722)' }}>
          <IconUtensils size={40} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Nunito, sans-serif' }}>
          Cardápio não encontrado
        </h1>
        <p style={{ fontSize: 14, opacity: 0.75, maxWidth: 320 }}>
          Esse link não existe ou a loja mudou de endereço. Confira o link com quem te
          enviou.
        </p>
        <Link
          href="/"
          style={{
            marginTop: 8,
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--accent, #FF5722)',
            textDecoration: 'none',
          }}
        >
          Criar meu cardápio no Cardápio Hub →
        </Link>
      </div>
    </div>
  )
}
