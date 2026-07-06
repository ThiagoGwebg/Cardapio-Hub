import Link from 'next/link'

/**
 * Peças reutilizáveis de upsell do plano Pro no painel:
 * medidor de uso do plano Free, banner de upgrade e seção bloqueada com prévia.
 */

export function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number }) {
  if (!Number.isFinite(limit)) return null
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const level = pct >= 100 ? 'full' : pct >= 80 ? 'warn' : 'ok'
  return (
    <div className="usage-meter">
      <div className="usage-meter-head">
        <span>{label}</span>
        <span className={`usage-meter-count usage-${level}`}>
          {used}/{limit}
        </span>
      </div>
      <div className="usage-meter-track">
        <div className={`usage-meter-fill usage-fill-${level}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function ProUpsellBanner({ title, text }: { title: string; text: string }) {
  return (
    <div className="upsell-banner">
      <div className="upsell-banner-info">
        <div className="upsell-banner-title">
          {title} <span className="pro-badge">Pro</span>
        </div>
        <div className="upsell-banner-text">{text}</div>
      </div>
      <Link href="/dashboard/billing" className="save-btn upsell-banner-btn">
        Assinar Pro
      </Link>
    </div>
  )
}

/**
 * Seção Pro bloqueada para o Free: mostra uma prévia desfocada do conteúdo
 * por trás de um overlay com CTA — o lojista vê o que está perdendo.
 */
export function ProLockedSection({
  title,
  text,
  children,
}: {
  title: string
  text: string
  children: React.ReactNode
}) {
  return (
    <div className="settings-card pro-locked-card">
      <div className="settings-section-title">
        {title} <span className="pro-badge">Pro</span>
      </div>
      <div className="pro-locked-preview" aria-hidden>
        {children}
      </div>
      <div className="pro-locked-overlay">
        <p className="pro-lock-text">{text}</p>
        <Link href="/dashboard/billing" className="save-btn pro-lock-btn">
          Desbloquear com o Pro
        </Link>
      </div>
    </div>
  )
}
