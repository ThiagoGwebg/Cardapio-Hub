'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { activatePush, initOneSignal } from '@/lib/onesignal'

const SEEN_PREFIX = 'cardapio-push-prompt-seen:'
const SNOOZE_PREFIX = 'cardapio-push-prompt-snooze-until:'
const SNOOZE_DAYS = 7
const FIRST_VISIT_DELAY_MS = 4000


/**
 * Banner contextual pra pedir permissão de notificação (via OneSignal) sem depender só
 * de uma página de configurações. Aparece num gatilho específico (pedido novo, pedido
 * finalizado) ou, na primeira visita, depois de um respiro. Sempre dispensável e nunca
 * reabre sozinho por 7 dias.
 */
export default function PushNotificationPrompt({
  scope,
  tags,
  storageKey,
  title,
  subtitle,
  triggerSignal = 0,
  triggerTitle,
  onActivated,
}) {
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [urgent, setUrgent] = useState(false)

  const seenKey = `${SEEN_PREFIX}${scope}:${storageKey}`
  const snoozeKey = `${SNOOZE_PREFIX}${scope}:${storageKey}`

  function eligible() {
    if (typeof window === 'undefined' || !('Notification' in window)) return false
    if (Notification.permission !== 'default') return false
    const snoozeUntil = Number(localStorage.getItem(snoozeKey) || 0)
    if (snoozeUntil > Date.now()) return false
    return true
  }

  useEffect(() => {
    initOneSignal(scope)
  }, [scope])

  // Gatilho contextual explícito (ex.: chegou um pedido novo).
  useEffect(() => {
    if (triggerSignal === 0) return
    if (!eligible()) return
    setUrgent(true)
    setVisible(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerSignal])

  // Primeira visita a esta tela: aparece uma vez, depois de um respiro.
  useEffect(() => {
    if (localStorage.getItem(seenKey)) return
    if (!eligible()) return
    const t = setTimeout(() => {
      if (eligible()) setVisible(true)
    }, FIRST_VISIT_DELAY_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function dismiss() {
    localStorage.setItem(seenKey, '1')
    localStorage.setItem(snoozeKey, String(Date.now() + SNOOZE_DAYS * 86400000))
    setVisible(false)
  }

  async function activate() {
    setBusy(true)
    localStorage.setItem(seenKey, '1')
    const result = await activatePush(scope, tags)
    if (result === 'ok') {
      onActivated?.()
    } else {
      localStorage.setItem(snoozeKey, String(Date.now() + SNOOZE_DAYS * 86400000))
    }
    setBusy(false)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="push-prompt" role="dialog" aria-live="polite">
      <span className="push-prompt-icon"><Bell size={20} strokeWidth={2.1} /></span>
      <div className="push-prompt-body">
        <div className="push-prompt-title">{urgent && triggerTitle ? triggerTitle : title}</div>
        <div className="push-prompt-sub">{subtitle}</div>
      </div>
      <div className="push-prompt-actions">
        <button className="save-btn" onClick={activate} disabled={busy} style={{ padding: '9px 18px', fontSize: 13 }}>
          {busy ? 'Ativando…' : 'Ativar'}
        </button>
        <button className="push-prompt-close" onClick={dismiss} aria-label="Fechar" disabled={busy}>
          <X size={16} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  )
}
