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

export default function InstallPwaButton({ storeName, appIconSrc }: { storeName: string; appIconSrc: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [cardOpen, setCardOpen] = useState(false)
  const [installing, setInstalling] = useState(false)

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
  if (!deferredPrompt && !isIos()) return null

  async function confirmInstall() {
    if (!deferredPrompt) return
    setInstalling(true)
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setInstalling(false)
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
    setCardOpen(false)
  }

  return (
    <>
      <button className="install-pwa-btn" onClick={() => setCardOpen(true)}>
        <span className="install-pwa-btn-icon">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={appIconSrc} alt="" width={18} height={18} />
        </span>
        Instalar app
      </button>

      {cardOpen && (
        <div className="pwa-overlay" onClick={() => !installing && setCardOpen(false)}>
          <div className="pwa-card" onClick={(e) => e.stopPropagation()}>
            <div className="pwa-card-top">
              <div className="pwa-app-icon">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={appIconSrc} alt={storeName} />
              </div>
              <div>
                <div className="pwa-card-title">{storeName}</div>
                <div className="pwa-card-subtitle">Peça em segundos, direto da tela inicial</div>
              </div>
            </div>

            <div className="pwa-benefits">
              <div className="pwa-benefit">
                <span className="pwa-benefit-icon">⚡</span>
                <span>Abre na hora, sem precisar buscar o site</span>
              </div>
              <div className="pwa-benefit">
                <span className="pwa-benefit-icon">📋</span>
                <span>Seus pedidos ficam salvos e fáceis de acompanhar</span>
              </div>
              <div className="pwa-benefit">
                <span className="pwa-benefit-icon">💾</span>
                <span>Leve — não ocupa espaço como um app de loja</span>
              </div>
            </div>

            {isIos() && !deferredPrompt ? (
              <>
                <div className="pwa-ios-steps">
                  <div className="pwa-ios-step">
                    <span className="pwa-ios-step-num">1</span>
                    <span>
                      Toque no ícone <span className="pwa-ios-glyph">⬆️</span> <b>Compartilhar</b> na barra do Safari
                    </span>
                  </div>
                  <div className="pwa-ios-step">
                    <span className="pwa-ios-step-num">2</span>
                    <span>
                      Escolha <b>&quot;Adicionar à Tela de Início&quot;</b>
                    </span>
                  </div>
                  <div className="pwa-ios-step">
                    <span className="pwa-ios-step-num">3</span>
                    <span>Toque em <b>Adicionar</b> — pronto!</span>
                  </div>
                </div>
                <button className="pwa-install-btn" onClick={() => setCardOpen(false)}>
                  Entendi
                </button>
              </>
            ) : (
              <>
                <button className="pwa-install-btn" onClick={confirmInstall} disabled={installing}>
                  {installing ? 'Instalando...' : 'Instalar agora'}
                </button>
                <button className="pwa-dismiss-btn" onClick={() => setCardOpen(false)}>
                  Agora não
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
