import type { Metadata } from 'next'
import Script from 'next/script'
import { Toaster } from 'sonner'
import './globals.css'
import Analytics from '@/components/analytics/Analytics'

export const metadata: Metadata = {
  title: 'Cardápio Hub',
  description: 'Cardápio digital e painel de gestão para pequenos negócios',
  // Declarados aqui, e não como `app/favicon.ico`/`app/icon.svg`: os arquivos de
  // convenção são injetados em TODA rota e não podem ser sobrescritos por um layout
  // aninhado. O favicon global vencia o da loja na aba do cardápio, porque o Next o
  // publica como 16×16 — casando exatamente com o tamanho que o navegador procura.
  // Como metadata, o layout de /loja/[slug] substitui por completo pela logo da loja.
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '16x16', type: 'image/x-icon' },
    ],
    shortcut: [{ url: '/favicon.ico' }],
    apple: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
}

// Captura o beforeinstallprompt o quanto antes, antes até do bundle do Next carregar.
// Sem isso, em visitas repetidas (com o service worker já registrado de antes) o Chrome
// dispara o evento antes do InstallPwaButton montar — como ninguém chamou
// preventDefault() a tempo, o Chrome cai no aviso automático dele (o "Agora não" nativo)
// em vez de deixar o nosso botão assumir. Guarda o evento em window.__bipEvent pro
// componente pegar depois. Precisa ser <Script strategy="beforeInteractive">, não um
// <script> comum no <head> — o Next reordena o <head> e pode colocar os próprios chunks
// (async) antes de um <script> declarado à mão, atrasando a captura o suficiente pra
// perder o evento de novo.
const CAPTURE_BIP_SCRIPT = `
(function () {
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.__bipEvent = e;
    window.dispatchEvent(new Event('bip-captured'));
  });
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <Script id="capture-bip" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: CAPTURE_BIP_SCRIPT }} />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;900&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Analytics />
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  )
}
