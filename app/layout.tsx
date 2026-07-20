import type { Metadata } from 'next'
import './globals.css'
import Analytics from '@/components/analytics/Analytics'

export const metadata: Metadata = {
  title: 'Cardápio Hub',
  description: 'Cardápio digital e painel de gestão para pequenos negócios',
}

// Captura o beforeinstallprompt o quanto antes, direto no <head>, antes do bundle do
// React carregar/hidratar. Sem isso, em conexões mais lentas o Chrome dispara o evento
// antes do InstallPwaButton montar — como ninguém chamou preventDefault() a tempo, o
// Chrome cai no aviso automático dele (o "Agora não" nativo) em vez de deixar o nosso
// botão assumir. Guarda o evento em window.__bipEvent pro componente pegar depois.
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
        <script dangerouslySetInnerHTML={{ __html: CAPTURE_BIP_SCRIPT }} />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;900&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Analytics />
        {children}
      </body>
    </html>
  )
}
