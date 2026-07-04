export default function NotificacoesPage() {
  const items = [
    { label: 'Novo pedido recebido', desc: 'Notificar quando chegar um novo pedido' },
    { label: 'Pedido em atraso', desc: 'Alertar quando pedido passar do tempo estimado' },
    { label: 'Som de notificação', desc: 'Tocar áudio ao receber novo pedido' },
  ]

  return (
    <>
      <div className="dash-header">
        <div className="dash-title">Notificações</div>
      </div>
      <div className="settings-card">
        <div className="settings-section-title">Preferências</div>
        {items.map((i) => (
          <div className="toggle-row" key={i.label}>
            <div>
              <div className="toggle-label">{i.label}</div>
              <div className="toggle-desc">{i.desc}</div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" disabled />
              <span className="toggle-slider"></span>
            </label>
          </div>
        ))}
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>
          Em breve — por enquanto, o pedido novo aparece ao vivo no Kanban de Pedidos.
        </p>
      </div>
    </>
  )
}
