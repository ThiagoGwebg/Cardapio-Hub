import type { Metadata } from 'next'

// Login e cadastro fora do índice: são páginas sem conteúdo pra buscador e
// competiriam com a home pela consulta "cardápio hub". As páginas em si são
// client components e não podem exportar metadata — daí este layout.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
