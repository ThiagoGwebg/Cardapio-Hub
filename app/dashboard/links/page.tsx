import { getCurrentStore } from '@/lib/store'
import CopyField from './CopyField'

export default async function LinksPage() {
  const { store } = await getCurrentStore()
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const menuUrl = `${base}/loja/${store.slug}`
  const waUrl = store.whatsapp_number ? `https://wa.me/${store.whatsapp_number.replace(/\D/g, '')}` : ''

  return (
    <>
      <div className="dash-header">
        <div className="dash-title">Meus Links</div>
      </div>
      <div className="settings-card">
        <div className="settings-section-title">Link do cardápio público</div>
        <CopyField value={menuUrl} />
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
          Compartilhe com seus clientes nas redes sociais
        </p>
      </div>
      {waUrl && (
        <div className="settings-card">
          <div className="settings-section-title">Link do WhatsApp</div>
          <CopyField value={waUrl} />
        </div>
      )}
    </>
  )
}
