'use client'

import { useEffect, useState } from 'react'
import { playNewOrderBeep } from '@/lib/sound'

const KEY = 'cardapio-order-alerts'

export default function OrderAlertsSettings() {
  const [enabled, setEnabled] = useState(false)
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>('default')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setEnabled(localStorage.getItem(KEY) === '1')
    setPerm('Notification' in window ? Notification.permission : 'unsupported')
    setReady(true)
  }, [])

  async function activate() {
    // Este clique é o "gesto" que libera áudio e permite pedir permissão de notificação.
    let granted = true
    if ('Notification' in window && Notification.permission !== 'granted') {
      try {
        const p = await Notification.requestPermission()
        setPerm(p)
        granted = p === 'granted'
      } catch {
        granted = false
      }
    }
    localStorage.setItem(KEY, '1')
    setEnabled(true)
    window.dispatchEvent(new Event('order-alerts-changed'))

    // Teste imediato pro lojista ver/ouvir que ativou.
    playNewOrderBeep()
    try {
      navigator.vibrate?.(200)
    } catch {
      /* sem vibração */
    }
    if (granted && 'Notification' in window) {
      try {
        new Notification('✅ Alertas ativados', { body: 'Você será avisado quando chegar um pedido novo.' })
      } catch {
        /* ignore */
      }
    }
  }

  function deactivate() {
    localStorage.setItem(KEY, '0')
    setEnabled(false)
    window.dispatchEvent(new Event('order-alerts-changed'))
  }

  if (!ready) return null

  const blocked = perm === 'denied'

  return (
    <div className="settings-card">
      <div className="settings-section-title">Alertas de pedido</div>
      <p className="settings-hint">
        Ative para ser avisado a cada pedido novo com <b>som</b>, <b>notificação na tela</b> (mesmo com a aba em segundo plano)
        e <b>vibração</b> no celular. O número de pedidos novos também aparece no título da aba e no menu.
      </p>

      {enabled ? (
        <div className="alert-status alert-status--on">
          <span className="alert-status-dot" /> Alertas <b>ativados</b> neste dispositivo
        </div>
      ) : (
        <div className="alert-status alert-status--off">
          <span className="alert-status-dot" /> Alertas desativados
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        {!enabled ? (
          <button className="save-btn" onClick={activate} style={{ marginBottom: 0 }}>
            🔔 Ativar alertas
          </button>
        ) : (
          <>
            <button className="save-btn" onClick={() => playNewOrderBeep()} style={{ marginBottom: 0 }}>
              Testar som
            </button>
            <button className="prod-form-cancel" onClick={deactivate}>
              Desativar
            </button>
          </>
        )}
      </div>

      {blocked && (
        <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 12 }}>
          As notificações estão bloqueadas nas configurações do navegador para este site. O som e o contador ainda funcionam;
          para receber a notificação na tela, libere as notificações nas permissões do site.
        </p>
      )}
      <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 12, lineHeight: 1.5 }}>
        Dica: no iPhone, a notificação do sistema só funciona se você instalar o painel como app (Compartilhar → Adicionar à Tela de Início).
        O som e o contador funcionam com a aba aberta. Ative em cada aparelho que você usa.
      </p>
    </div>
  )
}
