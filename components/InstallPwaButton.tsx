'use client'

import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Benefit = { icon: string; text: string }

const DEFAULT_BENEFITS: Benefit[] = [
  { icon: '⚡', text: 'Abre na hora, sem precisar buscar o site' },
  { icon: '📋', text: 'Seus pedidos ficam salvos e fáceis de acompanhar' },
  { icon: '💾', text: 'Leve — não ocupa espaço como um app de loja' },
]

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

export default function InstallPwaButton({
  storeName,
  appIconSrc,
  scope = '/loja/',
  title,
  subtitle = 'Peça em segundos, direto da tela inicial',
  benefits = DEFAULT_BENEFITS,
}: {
  storeName: string
  appIconSrc: string
  /** Escopo do service worker (cada seção do site — loja, painel — regista o próprio). */
  scope?: string
  title?: string
  subtitle?: string
  benefits?: Benefit[]
}) {
  const [mounted, setMounted] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  // Fica true assim que o navegador oferecer instalação nesta sessão — mesmo depois do
  // evento já ter sido consumido (não dá pra chamar .prompt() duas vezes no mesmo evento),
  // o botão continua disponível e cai pras instruções manuais em vez de sumir.
  const [canInstall, setCanInstall] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [cardOpen, setCardOpen] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    setMounted(true)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope }).catch(() => {})
    }

    if (isStandalone()) {
      setInstalled(true)
      return
    }

    // Sinal extra (Chrome/Android) pra pegar o caso de já instalado mas aberto fora do
    // modo standalone (ex.: abriu um link e caiu na aba normal do navegador).
    const nav = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> }
    nav.getInstalledRelatedApps
      ?.()
      .then((apps) => {
        if (apps?.length) setInstalled(true)
      })
      .catch(() => {})

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setCanInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    const onInstalled = () => setInstalled(true)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [scope])

  if (!mounted) return null
  if (installed) return null
  if (!canInstall && !isIos()) return null

  async function confirmInstall() {
    if (!deferredPrompt) return
    setInstalling(true)
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setInstalling(false)
    setDeferredPrompt(null)
    if (outcome === 'accepted') setInstalled(true)
    setCardOpen(false)
  }

  const showNativeStep = !!deferredPrompt
  const showIosSteps = isIos() && !showNativeStep
  const showManualSteps = !isIos() && !showNativeStep

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
                <div className="pwa-card-title">{title || storeName}</div>
                <div className="pwa-card-subtitle">{subtitle}</div>
              </div>
            </div>

            <div className="pwa-benefits">
              {benefits.map((b) => (
                <div className="pwa-benefit" key={b.text}>
                  <span className="pwa-benefit-icon">{b.icon}</span>
                  <span>{b.text}</span>
                </div>
              ))}
            </div>

            {showIosSteps ? (
              <>
                <div className="pwa-ios-steps">
                  <div className="pwa-ios-step">
                    <span className="pwa-ios-step-num">1</span>
                    <span>
                      Toque no ícone <span className="pwa-ios-glyph">⬆️</span> <b>Compartilhar</b> na barra do
                      Safari
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
                    <span>
                      Toque em <b>Adicionar</b> — pronto!
                    </span>
                  </div>
                </div>
                <button className="pwa-install-btn" onClick={() => setCardOpen(false)}>
                  Entendi
                </button>
              </>
            ) : showManualSteps ? (
              <>
                <div className="pwa-ios-steps">
                  <div className="pwa-ios-step">
                    <span className="pwa-ios-step-num">1</span>
                    <span>
                      Abra o menu <b>⋮</b> do navegador
                    </span>
                  </div>
                  <div className="pwa-ios-step">
                    <span className="pwa-ios-step-num">2</span>
                    <span>
                      Toque em <b>&quot;Instalar app&quot;</b> ou <b>&quot;Adicionar à tela inicial&quot;</b>
                    </span>
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
