// URL base do site, resiliente a esquecer de configurar NEXT_PUBLIC_SITE_URL.
//
// Ordem de resolução:
//  1. NEXT_PUBLIC_SITE_URL (se setada e não for localhost) — domínio oficial/custom.
//  2. VERCEL_PROJECT_PRODUCTION_URL — domínio de produção que a Vercel injeta sozinha.
//  3. VERCEL_URL — URL do deploy atual (preview/prod).
//  4. localhost — só em dev.
//
// Assim, mesmo que ninguém configure a env var no painel da Vercel, os links
// compartilháveis do lojista (cardápio, QR) saem com a URL de produção correta.
export function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  if (explicit && !explicit.includes('localhost')) return explicit

  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (prod) return `https://${prod}`

  const current = process.env.VERCEL_URL?.trim()
  if (current) return `https://${current}`

  return explicit || 'http://localhost:3000'
}
