'use client'

import { useEffect, useState } from 'react'

// Evento não-padrão do Chrome/Edge/Android que permite disparar a instalação da PWA.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIosHelp, setShowIosHelp] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // Registra o service worker no escopo /admin — requisito do Chrome pra oferecer a instalação
    // (dispara o beforeinstallprompt). Mesmo sw.js já usado na loja, com scope próprio.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/admin' }).catch(() => {})
    }

    // Detecção após montar (evita setState síncrono no corpo do efeito e mismatch de hidratação).
    const raf = requestAnimationFrame(() => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
      if (standalone) {
        setInstalled(true)
        return
      }
      setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent))
    })

    const onPrompt = (e: Event) => {
      e.preventDefault() // guarda o evento pra disparar no clique
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // Some quando já instalado, ou quando o navegador não oferece instalação (ex.: desktop Firefox).
  if (installed) return null
  if (!deferred && !isIOS) return null

  async function handleClick() {
    if (deferred) {
      setInstalling(true)
      try {
        await deferred.prompt()
        const choice = await deferred.userChoice
        if (choice.outcome === 'accepted') setInstalled(true)
      } catch {
        /* ignore */
      }
      setInstalling(false)
      setDeferred(null)
    } else {
      // iOS/Safari não tem instalação programática — mostra o passo a passo.
      setShowIosHelp(true)
    }
  }

  return (
    <>
      <button className="adm-install" onClick={handleClick} disabled={installing} title="Instalar o painel como app">
        {installing ? (
          <span className="btn-spinner" aria-hidden />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        )}
        <span>{installing ? 'Abrindo…' : 'Instalar app'}</span>
      </button>

      {showIosHelp && (
        <div className="leads-modal-overlay" onClick={() => setShowIosHelp(false)}>
          <div className="leads-modal" onClick={(e) => e.stopPropagation()}>
            <div className="leads-modal-head">
              <div className="leads-modal-title">📲 Instalar no iPhone</div>
              <button className="leads-modal-close" onClick={() => setShowIosHelp(false)} aria-label="Fechar">✕</button>
            </div>
            <p className="leads-modal-sub">
              No <strong>Safari</strong>, toque no botão <strong>Compartilhar</strong> (o quadrado com a seta pra cima,
              embaixo) e escolha <strong>Adicionar à Tela de Início</strong>. O painel abre como um app — inclusive com
              os alertas de novos leads.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
