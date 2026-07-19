import Link from 'next/link'
import { getCurrentStore } from '@/lib/store'
import { isStorePro } from '@/lib/plan'
import { getBaseUrl } from '@/lib/baseUrl'
import { ProLockedSection } from '@/components/dashboard/ProUpsell'
import CopyField from './CopyField'

export default async function LinksPage() {
  const { supabase, store } = await getCurrentStore()
  const isPro = await isStorePro(supabase, store.id)
  const base = getBaseUrl()
  const menuUrl = `${base}/loja/${store.slug}`
  const waUrl = store.whatsapp_number ? `https://wa.me/${store.whatsapp_number.replace(/\D/g, '')}` : ''
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=16&data=${encodeURIComponent(menuUrl)}`

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

      {isPro ? (
        <div className="settings-card">
          <div className="settings-section-title">
            QR Code do cardápio <span className="pro-badge">Pro</span>
          </div>
          <div className="qr-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt={`QR Code do cardápio de ${store.name}`} className="qr-img" />
            <div>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
                Imprima e cole nas mesas, no balcão ou na embalagem: o cliente aponta a câmera e cai
                direto no seu cardápio.
              </p>
              <a className="save-btn" style={{ textDecoration: 'none', display: 'inline-block' }} href={qrUrl} target="_blank" rel="noopener">
                Abrir em tamanho grande
              </a>
            </div>
          </div>
        </div>
      ) : (
        <ProLockedSection
          title="QR Code do cardápio"
          text="Imprima o QR Code da sua loja e cole nas mesas, no balcão ou nas embalagens — o cliente escaneia e pede na hora."
        >
          <div className="qr-card">
            <div className="qr-img qr-placeholder">▦</div>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              QR Code exclusivo da sua loja, pronto para imprimir.
            </p>
          </div>
        </ProLockedSection>
      )}

      {!isPro && (
        <p style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 4 }}>
          Assinando o <Link href="/dashboard/billing" style={{ color: 'var(--primary)' }}>Pro</Link>, o
          selo &quot;Feito com Cardápio Hub&quot; também é removido do seu cardápio público.
        </p>
      )}
    </>
  )
}
