'use client'

import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIos() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export default function InstallPwaButton({ storeName }: { storeName: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [showIosHint, setShowIosHint] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/loja/' }).catch(() => {})
    }

    if (isStandalone()) {
      setInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    const onInstalled = () => setInstalled(true)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  async function handleClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setDeferredPrompt(null)
      return
    }
    if (isIos()) {
      setShowIosHint(true)
      return
    }
  }

  if (!deferredPrompt && !isIos()) return null

  return (
    <>
      <button className="install-pwa-btn" onClick={handleClick}>
        📲 Instalar app
      </button>
      {showIosHint && (
        <div className="option-modal-overlay" onClick={() => setShowIosHint(false)}>
          <div className="option-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div className="option-modal-header">
              <div className="option-modal-title">Instalar {storeName}</div>
            </div>
            <div className="option-modal-body" style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>
              <p>No iPhone/iPad:</p>
              <ol style={{ paddingLeft: 20, marginTop: 8 }}>
                <li>Toque no ícone de <b>Compartilhar</b> (o quadrado com a seta ↑) na barra do Safari</li>
                <li>Escolha <b>&quot;Adicionar à Tela de Início&quot;</b></li>
                <li>Toque em <b>Adicionar</b></li>
              </ol>
            </div>
            <div className="option-modal-footer">
              <button className="checkout-btn" onClick={() => setShowIosHint(false)}>Entendi</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
