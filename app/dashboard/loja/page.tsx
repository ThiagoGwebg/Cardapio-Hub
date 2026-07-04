import { getCurrentStore } from '@/lib/store'
import { updateStore } from './actions'

type Theme = { primaryColor?: string; logoUrl?: string; bannerUrl?: string }

export default async function LojaPage() {
  const { store } = await getCurrentStore()
  const theme = (store.theme ?? {}) as Theme

  return (
    <>
      <div className="dash-header">
        <div className="dash-title">Minha Loja</div>
      </div>

      <form action={updateStore}>
        <div className="settings-card">
          <div className="settings-section-title">Informações básicas</div>
          <div className="form-group">
            <label className="form-label">Nome da loja</label>
            <input className="form-input" name="name" defaultValue={store.name} />
          </div>
          <div className="form-group">
            <label className="form-label">Endereço</label>
            <input className="form-input" name="address" defaultValue={store.address ?? ''} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">WhatsApp</label>
              <input className="form-input" name="whatsapp" defaultValue={store.whatsapp_number ?? ''} />
            </div>
            <div className="form-group">
              <label className="form-label">Pedido mínimo (R$)</label>
              <input
                className="form-input"
                name="minOrder"
                type="number"
                step="0.01"
                min="0"
                defaultValue={(store.min_order_cents / 100).toFixed(2)}
              />
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-section-title">Identidade visual do cardápio público</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Cor principal</label>
              <input
                className="form-input"
                name="primaryColor"
                type="color"
                defaultValue={theme.primaryColor || '#FF5722'}
                style={{ height: 40, padding: 4 }}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">URL do logo</label>
            <input className="form-input" name="logoUrl" defaultValue={theme.logoUrl || ''} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label className="form-label">URL do banner</label>
            <input className="form-input" name="bannerUrl" defaultValue={theme.bannerUrl || ''} placeholder="https://..." />
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>
            Essas cores e imagens aparecem no seu cardápio público em <code>/loja/{store.slug}</code>.
          </p>
        </div>

        <div className="settings-card">
          <div className="settings-section-title">Status</div>
          <div className="toggle-row">
            <div>
              <div className="toggle-label">Loja aberta</div>
              <div className="toggle-desc">Clientes podem fazer pedidos agora</div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" name="isOpen" defaultChecked={store.is_open} />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <button className="save-btn" type="submit">Salvar alterações</button>
      </form>
    </>
  )
}
