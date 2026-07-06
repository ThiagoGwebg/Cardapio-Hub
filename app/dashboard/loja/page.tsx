import { getCurrentStore } from '@/lib/store'
import { fmtCents } from '@/lib/format'
import { isStorePro, STORE_FONTS, DEFAULT_STORE_FONT } from '@/lib/plan'
import { updateStore, addZone, deleteZone } from './actions'
import PixKeyField from '@/components/PixKeyField'
import ImageUploadField from '@/components/ImageUploadField'

type Theme = { primaryColor?: string; logoUrl?: string; bannerUrl?: string; font?: string; announcement?: string }

export default async function LojaPage() {
  const { supabase, store } = await getCurrentStore()
  const theme = (store.theme ?? {}) as Theme
  const isPro = await isStorePro(supabase, store.id)

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
          <PixKeyField defaultType={store.pix_key_type} defaultValue={store.pix_key} />
        </div>

        <div className="settings-card">
          <div className="settings-section-title">Identidade visual do cardápio público</div>

          <ImageUploadField
            kind="logo"
            name="logoUrl"
            label="Logo da loja"
            hint="Imagem quadrada (ideal 512×512). PNG, JPG, WEBP ou SVG até 5 MB."
            defaultUrl={theme.logoUrl || ''}
          />

          <ImageUploadField
            kind="banner"
            name="bannerUrl"
            label="Banner do topo"
            hint="Imagem larga (ideal 1200×400). Aparece no topo do seu cardápio."
            defaultUrl={theme.bannerUrl || ''}
          />

          <div className="pro-block">
            <div className="pro-block-head">
              <span>Cores e fonte</span>
              {!isPro && <span className="pro-badge">Pro</span>}
            </div>

            {isPro ? (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Cor principal</label>
                    <input className="form-input" name="primaryColor" type="color" defaultValue={theme.primaryColor || '#FF5722'} style={{ height: 40, padding: 4 }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fonte do cardápio</label>
                    <select className="form-input" name="font" defaultValue={theme.font || DEFAULT_STORE_FONT}>
                      {STORE_FONTS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: 8 }}>
                  <label className="form-label">Aviso promocional no cardápio</label>
                  <input
                    className="form-input"
                    name="announcement"
                    maxLength={120}
                    placeholder='Ex.: "Frete grátis acima de R$ 50 hoje!"'
                    defaultValue={theme.announcement || ''}
                  />
                  <p style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 4 }}>
                    Aparece em destaque no topo do cardápio público. Deixe vazio para ocultar.
                  </p>
                </div>
              </>
            ) : (
              <div className="pro-lock">
                <p className="pro-lock-text">
                  Deixe o cardápio com a sua cara: escolha a <strong>cor principal</strong>, a{' '}
                  <strong>fonte</strong> e publique um <strong>aviso promocional</strong> no topo do
                  cardápio. No Pro, o selo &quot;Feito com CardápioÁgil&quot; também some da sua página.
                </p>
                <a href="/dashboard/billing" className="save-btn pro-lock-btn">Assinar Pro</a>
              </div>
            )}
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
