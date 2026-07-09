// Helpers de rastreamento de conversão para o lado do cliente.
//
// São no-ops seguros: se o Meta Pixel / Google tag não estiverem carregados
// (env vars não configuradas), as funções simplesmente não fazem nada. Assim o
// código de disparo de eventos pode viver nos componentes sem quebrar nada
// quando você ainda não plugou os pixels.
//
// Configure em produção (Vercel → Settings → Environment Variables):
//   NEXT_PUBLIC_META_PIXEL_ID   → ID do Pixel da Meta (Facebook/Instagram Ads)
//   NEXT_PUBLIC_GA_ID           → ID do GA4, formato G-XXXXXXX
//   NEXT_PUBLIC_GOOGLE_ADS_ID   → ID do Google Ads, formato AW-XXXXXXXXX
//   NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL → (opcional) rótulo de conversão de lead

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
  }
}

/** Conversão principal: lead preencheu o formulário da landing. */
export function trackLead(data?: { segment?: string; revenue?: string }): void {
  if (typeof window === 'undefined') return
  try {
    window.fbq?.('track', 'Lead', {
      content_category: data?.segment || undefined,
      content_name: data?.revenue || undefined,
    })
    window.gtag?.('event', 'generate_lead', {
      segment: data?.segment,
      revenue_band: data?.revenue,
    })
    const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID
    const label = process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL
    if (adsId && label) {
      window.gtag?.('event', 'conversion', { send_to: `${adsId}/${label}` })
    }
  } catch {
    // rastreamento nunca deve quebrar a experiência do usuário
  }
}

/** Cadastro self-serve concluído (loja criada). */
export function trackSignup(): void {
  if (typeof window === 'undefined') return
  try {
    window.fbq?.('track', 'CompleteRegistration')
    window.gtag?.('event', 'sign_up')
  } catch {
    /* no-op */
  }
}

export {}
