import { getCurrentStore } from '@/lib/store'
import { fmtCents } from '@/lib/format'
import { isStorePro } from '@/lib/plan'
import type { StoreTheme } from '@/lib/storeTheme'
import { updateStore, updateOnlinePayment, disconnectMercadoPago, addZone, deleteZone } from './actions'
import DisconnectMpButton from './DisconnectMpButton'
import PixKeyField from '@/components/PixKeyField'
import ImageUploadField from '@/components/ImageUploadField'
import ProCustomizationPanel from './ProCustomizationPanel'
import { ProLockedSection } from '@/components/dashboard/ProUpsell'
import SubmitButton from '@/components/ui/SubmitButton'

export default async function LojaPage({ searchParams }: { searchParams: Promise<{ mp?: string }> }) {
  const { supabase, store } = await getCurrentStore()
  const theme = (store.theme ?? {}) as StoreTheme
  const isPro = await isStorePro(supabase, store.id)
  const { mp } = await searchParams

  const mpBanner =
    mp === 'connected'
      ? { kind: 'ok', text: 'Mercado Pago conectado! Agora você já pode receber pagamentos pelo app.' }
      : mp === 'error'
        ? { kind: 'err', text: 'Não foi possível conectar o Mercado Pago. Tente novamente.' }
        : mp === 'config_error'
          ? { kind: 'err', text: 'O pagamento online ainda não está configurado no servidor. Fale com o suporte.' }
          : null

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

      {mpBanner && (
        <div
          className="settings-card"
          style={{
            borderColor: mpBanner.kind === 'ok' ? '#16a34a' : '#dc2626',
            color: mpBanner.kind === 'ok' ? '#166534' : '#991b1b',
          }}
        >
          {mpBanner.text}
        </div>
      )}

      {/* Card à parte do form principal: conectar o Mercado Pago navega pra fora, então não pode
          arrastar junto as edições não salvas dos outros campos. Toggle tem ação própria. */}
      <div className="settings-card">
        <div className="settings-section-title">Pagamento online (Pix pelo app)</div>
        <p className="settings-hint">
          Receba o pagamento do cliente <b>dentro do app</b>, direto na sua conta Mercado Pago. O
          pedido só cai aqui no painel <b>depois que o pagamento é confirmado</b> — sem risco de
          calote. O dinheiro cai na sua conta; o Cardápio Hub não cobra comissão por pedido.
        </p>

        <div className="toggle-row">
          <div>
            <div className="toggle-label">Conta Mercado Pago</div>
            <div className="toggle-desc">{store.mp_connected ? '✓ Conectada' : 'Nenhuma conta conectada ainda.'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <a className="save-btn" href="/api/mp/oauth/start" style={{ textDecoration: 'none' }}>
              {store.mp_connected ? 'Reconectar' : 'Conectar Mercado Pago'}
            </a>
            {store.mp_connected && <DisconnectMpButton action={disconnectMercadoPago} />}
          </div>
        </div>

        <form action={updateOnlinePayment}>
          <div className="toggle-row">
            <div>
              <div className="toggle-label">Receber Pix pelo app</div>
              <div className="toggle-desc">
                {store.mp_connected
                  ? 'O cliente paga o Pix na hora e o pedido é liberado automaticamente.'
                  : 'Conecte sua conta Mercado Pago para ativar.'}
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" name="onlinePaymentEnabled" defaultChecked={store.online_payment_enabled} disabled={!store.mp_connected} />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <SubmitButton className="save-btn" style={{ marginTop: 12 }}>Salvar pagamento online</SubmitButton>
        </form>
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
          <p className="settings-hint">
            Escolha como seus clientes recebem os pedidos. <b>Tem entregador/motoboy próprio?</b> Ligue a <b>Entrega</b>.
            Se você só atende no balcão, deixe apenas a <b>Retirada</b> — o cliente nem vê a opção de entrega no cardápio.
          </p>
          <div className="toggle-row">
            <div><div className="toggle-label">Entrega (delivery)</div><div className="toggle-desc">Você leva no endereço do cliente com seu próprio entregador/motoboy</div></div>
            <label className="toggle-switch"><input type="checkbox" name="deliveryEnabled" defaultChecked={store.delivery_enabled} /><span className="toggle-slider"></span></label>
          </div>
          <div className="toggle-row">
            <div><div className="toggle-label">Retirada no local</div><div className="toggle-desc">O cliente busca o pedido no seu balcão</div></div>
            <label className="toggle-switch"><input type="checkbox" name="pickupEnabled" defaultChecked={store.pickup_enabled} /><span className="toggle-slider"></span></label>
          </div>
          <div className="toggle-row">
            <div><div className="toggle-label">Pedido na mesa</div><div className="toggle-desc">Para consumo no local, via QR code / número da mesa</div></div>
            <label className="toggle-switch"><input type="checkbox" name="dineInEnabled" defaultChecked={store.dine_in_enabled} /><span className="toggle-slider"></span></label>
          </div>
          <p className="settings-hint" style={{ marginTop: 12 }}>
            Os campos abaixo valem quando a <b>Entrega</b> está ligada.
          </p>
          <div className="form-row">
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

        </div>

        {/* Personalização avançada — exclusiva Pro. No Free, uma prévia bloqueada com CTA. */}
        {isPro ? (
          <div className="settings-card">
            <ProCustomizationPanel theme={theme} />
          </div>
        ) : (
          <ProLockedSection
            title="Personalização avançada"
            text="Escolha a tipografia, monte uma paleta com cor primária, secundária e de destaque, defina o layout do cardápio e publique um aviso promocional. O selo “Feito com Cardápio Hub” também some da sua página."
          >
            <ProCustomizationPanel theme={theme} />
          </ProLockedSection>
        )}

        <div className="settings-card">
          <div className="settings-section-title">Status</div>
          <div className="toggle-row">
            <div><div className="toggle-label">Loja aberta</div><div className="toggle-desc">Clientes podem fazer pedidos agora</div></div>
            <label className="toggle-switch"><input type="checkbox" name="isOpen" defaultChecked={store.is_open} /><span className="toggle-slider"></span></label>
          </div>
        </div>

        <SubmitButton className="save-btn">Salvar alterações</SubmitButton>
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
              <SubmitButton className="ordertype-btn" style={{ flex: 'none', padding: '6px 12px' }} pendingLabel="Removendo…">Remover</SubmitButton>
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
          <SubmitButton className="save-btn" style={{ marginBottom: 0 }} pendingLabel="Adicionando…">Adicionar</SubmitButton>
        </form>
      </div>
    </>
  )
}
