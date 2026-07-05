import { getCurrentStore } from '@/lib/store'
import { fmtCents } from '@/lib/format'
import { updateStore, addZone, deleteZone } from './actions'

type Theme = { primaryColor?: string; logoUrl?: string; bannerUrl?: string }

export default async function LojaPage() {
  const { supabase, store } = await getCurrentStore()
  const theme = (store.theme ?? {}) as Theme

  const { data: zones } = await supabase
    .from('delivery_zones')
    .select('id, neighborhood, fee_cents, min_order_cents')
    .eq('store_id', store.id)
    .order('sort_order', { ascending: true })

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
              <input className="form-input" name="minOrder" type="number" step="0.01" min="0" defaultValue={(store.min_order_cents / 100).toFixed(2)} />
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-section-title">Como finalizar o pedido</div>
          <div className="ordertype-row">
            <label style={{ flex: 1 }}>
              <input type="radio" name="checkoutMode" value="whatsapp" defaultChecked={store.checkout_mode !== 'system'} style={{ display: 'none' }} />
              <span className={`ordertype-btn ${store.checkout_mode !== 'system' ? 'active' : ''}`} style={{ display: 'block', textAlign: 'center' }}>
                Abrir WhatsApp
              </span>
            </label>
            <label style={{ flex: 1 }}>
              <input type="radio" name="checkoutMode" value="system" defaultChecked={store.checkout_mode === 'system'} style={{ display: 'none' }} />
              <span className={`ordertype-btn ${store.checkout_mode === 'system' ? 'active' : ''}`} style={{ display: 'block', textAlign: 'center' }}>
                Só confirmar no sistema
              </span>
            </label>
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
            <b>Abrir WhatsApp:</b> o cliente finaliza e é levado ao WhatsApp da loja com o pedido pronto pra enviar — bom pra manter contato direto.<br />
            <b>Só confirmar no sistema:</b> o pedido cai direto no seu Kanban e o cliente acompanha pela página de status, sem sair do cardápio. Use "Avisar cliente" no Kanban pra notificar pelo WhatsApp quando quiser.
          </p>
        </div>

        <div className="settings-card">
          <div className="settings-section-title">Canais de pedido</div>
          <div className="toggle-row">
            <div><div className="toggle-label">Entrega (delivery)</div><div className="toggle-desc">Clientes recebem no endereço</div></div>
            <label className="toggle-switch"><input type="checkbox" name="deliveryEnabled" defaultChecked={store.delivery_enabled} /><span className="toggle-slider"></span></label>
          </div>
          <div className="toggle-row">
            <div><div className="toggle-label">Retirada no local</div><div className="toggle-desc">Cliente busca o pedido</div></div>
            <label className="toggle-switch"><input type="checkbox" name="pickupEnabled" defaultChecked={store.pickup_enabled} /><span className="toggle-slider"></span></label>
          </div>
          <div className="toggle-row">
            <div><div className="toggle-label">Pedido na mesa</div><div className="toggle-desc">Via QR code / número da mesa</div></div>
            <label className="toggle-switch"><input type="checkbox" name="dineInEnabled" defaultChecked={store.dine_in_enabled} /><span className="toggle-slider"></span></label>
          </div>
          <div className="form-row" style={{ marginTop: 8 }}>
            <div className="form-group">
              <label className="form-label">Taxa de entrega padrão (R$)</label>
              <input className="form-input" name="deliveryFee" type="number" step="0.01" min="0" defaultValue={(store.delivery_fee_cents / 100).toFixed(2)} />
            </div>
            <div className="form-group">
              <label className="form-label">Tempo de preparo (min)</label>
              <input className="form-input" name="prepMin" type="number" min="0" defaultValue={store.estimated_prep_min} />
            </div>
            <div className="form-group">
              <label className="form-label">Tempo de entrega (min)</label>
              <input className="form-input" name="deliveryMin" type="number" min="0" defaultValue={store.estimated_delivery_min} />
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-section-title">Formas de pagamento</div>
          <div className="toggle-row">
            <div><div className="toggle-label">Dinheiro</div></div>
            <label className="toggle-switch"><input type="checkbox" name="acceptsCash" defaultChecked={store.accepts_cash} /><span className="toggle-slider"></span></label>
          </div>
          <div className="toggle-row">
            <div><div className="toggle-label">Cartão (na entrega)</div></div>
            <label className="toggle-switch"><input type="checkbox" name="acceptsCard" defaultChecked={store.accepts_card} /><span className="toggle-slider"></span></label>
          </div>
          <div className="toggle-row">
            <div><div className="toggle-label">Pix</div></div>
            <label className="toggle-switch"><input type="checkbox" name="acceptsPix" defaultChecked={store.accepts_pix} /><span className="toggle-slider"></span></label>
          </div>
          <div className="form-group" style={{ marginTop: 8 }}>
            <label className="form-label">Chave Pix (aparece no checkout)</label>
            <input className="form-input" name="pixKey" defaultValue={store.pix_key ?? ''} placeholder="email, telefone ou chave aleatória" />
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-section-title">Identidade visual do cardápio público</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Cor principal</label>
              <input className="form-input" name="primaryColor" type="color" defaultValue={theme.primaryColor || '#FF5722'} style={{ height: 40, padding: 4 }} />
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
        </div>

        <div className="settings-card">
          <div className="settings-section-title">Status</div>
          <div className="toggle-row">
            <div><div className="toggle-label">Loja aberta</div><div className="toggle-desc">Clientes podem fazer pedidos agora</div></div>
            <label className="toggle-switch"><input type="checkbox" name="isOpen" defaultChecked={store.is_open} /><span className="toggle-slider"></span></label>
          </div>
        </div>

        <button className="save-btn" type="submit">Salvar alterações</button>
      </form>

      <div className="settings-card" style={{ marginTop: 20 }}>
        <div className="settings-section-title">Zonas de entrega (taxa por bairro)</div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
          Se um bairro estiver cadastrado, a taxa dele substitui a taxa padrão. Bairros fora da lista usam a taxa padrão.
        </p>
        {(zones ?? []).map((z) => (
          <div className="cardapio-item" key={z.id}>
            <div className="ci-info">
              <div className="ci-name">{z.neighborhood}</div>
              <div className="ci-cat">
                Taxa {fmtCents(z.fee_cents)}{z.min_order_cents > 0 ? ` · mín. ${fmtCents(z.min_order_cents)}` : ''}
              </div>
            </div>
            <form action={deleteZone.bind(null, z.id)}>
              <button className="ordertype-btn" style={{ flex: 'none', padding: '6px 12px' }} type="submit">Remover</button>
            </form>
          </div>
        ))}
        <form action={addZone} className="form-row" style={{ marginTop: 12, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label">Bairro</label>
            <input className="form-input" name="neighborhood" required />
          </div>
          <div className="form-group">
            <label className="form-label">Taxa (R$)</label>
            <input className="form-input" name="fee" type="number" step="0.01" min="0" defaultValue="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Mín. (R$)</label>
            <input className="form-input" name="zoneMin" type="number" step="0.01" min="0" defaultValue="0" />
          </div>
          <button className="save-btn" type="submit" style={{ marginBottom: 0 }}>Adicionar</button>
        </form>
      </div>
    </>
  )
}
