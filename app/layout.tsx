import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CardápioÁgil',
  description: 'Cardápio digital e painel de gestão para pequenos negócios',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;900&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
