import type { Metadata } from 'next'
import Script from 'next/script'
import { Toaster } from 'sonner'
import './globals.css'
import Analytics from '@/components/analytics/Analytics'
import { brandIcons } from '@/lib/brandIcons'
import {
  absoluteUrl,
  BING_SITE_VERIFICATION,
  GOOGLE_SITE_VERIFICATION,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
} from '@/lib/seo'

export const metadata: Metadata = {
  // metadataBase é o que transforma `openGraph.images: '/x.png'` em URL absoluta.
  // Sem ele o Next emite path relativo e o WhatsApp/Facebook não renderiza a prévia.
  metadataBase: new URL(absoluteUrl('/')),
  title: {
    default: `${SITE_NAME} — ${SITE_TITLE}`,
    // Páginas filhas definem só o próprio título; a marca entra pelo template.
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: absoluteUrl('/') }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'business',
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'pt_BR',
    url: absoluteUrl('/'),
    title: `${SITE_NAME} — ${SITE_TITLE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TITLE}`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Sem limite de tamanho de snippet/preview: dá ao Google liberdade pra
      // montar rich results maiores (imagem grande, trecho longo).
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  // Emitido só quando há código configurado (ver lib/seo.ts pra onde colar).
  verification: {
    google: GOOGLE_SITE_VERIFICATION || undefined,
    other: BING_SITE_VERIFICATION ? { 'msvalidate.01': BING_SITE_VERIFICATION } : undefined,
  },
  // Declarados aqui, e não como `app/favicon.ico`/`app/icon.svg`: os arquivos de
  // convenção são injetados em TODA rota e não podem ser sobrescritos por um layout
  // aninhado. O favicon global vencia o da loja na aba do cardápio, porque o Next o
  // publica como 16×16 — casando exatamente com o tamanho que o navegador procura.
  // Como metadata, o layout de /loja/[slug] substitui por completo pela logo da loja.
  icons: brandIcons(),
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
        {/* Abre a conexão TLS com o Google Fonts antes do CSS ser pedido: a folha de
            estilo é render-blocking, então esse handshake antecipado corta ~200-400ms
            do LCP em 4G — que é exatamente o que o Core Web Vitals mede. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
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
