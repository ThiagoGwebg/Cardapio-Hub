import { Clock } from 'lucide-react'

/**
 * Tela mostrada quando o cardápio está fora do ar por mensalidade suspensa.
 * De propósito não menciona pagamento: para o cliente final é só indisponibilidade.
 */
export default function StoreUnavailable({ name }: { name: string }) {
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
        <Clock size={40} strokeWidth={1.8} style={{ color: 'var(--accent, #FF5722)' }} />
        <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Nunito, sans-serif' }}>{name}</h1>
        <p style={{ fontSize: 14, opacity: 0.75, maxWidth: 320 }}>
          Este cardápio está temporariamente indisponível. Tente novamente mais tarde.
        </p>
      </div>
    </div>
  )
}
