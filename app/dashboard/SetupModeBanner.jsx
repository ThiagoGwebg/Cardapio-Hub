import Link from 'next/link'
import { Wrench } from 'lucide-react'

/**
 * Faixa exibida enquanto a loja está em montagem assistida (painel liberado pelo
 * time, cardápio ainda fora do ar). Deixa explícito que ninguém consegue pedir
 * ainda — senão o lojista monta tudo, divulga o link e descobre pelo cliente.
 */
export default function SetupModeBanner() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        margin: '0 0 14px',
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        background: 'rgba(255, 87, 34, .10)',
        color: 'var(--accent, #FF5722)',
        border: '1px solid rgba(255, 87, 34, .25)',
      }}
    >
      <Wrench size={16} strokeWidth={2.3} />
      <span>
        Modo montagem: monte seu cardápio à vontade. Ele ainda <b>não está no ar</b> para os
        clientes — entra assim que o primeiro pagamento for confirmado.
      </span>
      <Link
        href="/dashboard/billing"
        style={{ marginLeft: 'auto', whiteSpace: 'nowrap', color: 'inherit', fontWeight: 700 }}
      >
        Ativar →
      </Link>
    </div>
  )
}
