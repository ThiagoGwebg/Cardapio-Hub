'use client'

import { useEffect, useRef, useState } from 'react'
import ModelViewer from '@/components/ModelViewer'

/*
 * Visualizador 3D + realidade aumentada do produto, portado da demo de vendas:
 *
 *  1. "Ver na sua mesa" abre uma folha com 3 dicas (sempre: quem não acha a
 *     mesa é justamente quem precisa reler).
 *  2. "Abrir a câmera" chama activateAR() dentro do toque.
 *  3. Navegador do Instagram/Facebook/TikTok não abre AR: no Android tenta
 *     pular para o Chrome por intent://; no iPhone explica o caminho.
 *  4. Android sem ARCore volta do Scene Viewer com um sinal na URL — a folha
 *     "sem AR" explica o que instalar.
 *  5. Aparelho sem RA (computador/tablet): mostra um QR que abre este produto
 *     direto no celular.
 */

const SINAL_SEM_AR = '#model-viewer-no-ar-fallback'
const LOJA_ARCORE = 'https://play.google.com/store/apps/details?id=com.google.ar.core'
const LOJA_GOOGLE = 'https://play.google.com/store/apps/details?id=com.google.android.googlequicksearchbox'

function navegadorDeApp() {
  return /Instagram|FBAN|FBAV|FB_IAB|Messenger|TikTok|Line\/|Snapchat|; wv\)/i.test(navigator.userAgent || '')
}

export default function ArProductViewer({ src, alt, sizeCm, productId }) {
  const viewerRef = useRef(null)
  const [canAR, setCanAR] = useState(null) // null = ainda não sabe
  const [sheet, setSheet] = useState(null) // 'dicas' | 'sem-ar' | 'navegador' | null
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState(null)
  const tentouAR = useRef(false)
  const inApp = typeof navigator !== 'undefined' && navegadorDeApp()

  // Captura o elemento <model-viewer> quando o wrapper montar.
  const bindViewer = (el) => {
    viewerRef.current = el?.querySelector('model-viewer') ?? null
  }

  useEffect(() => {
    const host = document.getElementById(`ar-host-${productId}`)
    if (!host) return

    let visor = null
    let disposed = false

    const onLoad = () => {
      if (visor) setCanAR(!!visor.canActivateAR)
    }
    const onArStatus = (e) => {
      if (e.detail?.status === 'failed') semAR()
    }

    // O <model-viewer> só entra no DOM depois do import dinâmico resolver,
    // então não dá pra anexar listeners na montagem: fica numa sondagem leve
    // até o elemento aparecer (ou desistir).
    let tries = 0
    const procurar = setInterval(() => {
      tries += 1
      const el = host.querySelector('model-viewer')
      if (el) {
        clearInterval(procurar)
        visor = el
        viewerRef.current = el
        el.addEventListener('load', onLoad)
        el.addEventListener('ar-status', onArStatus)
        if (el.loaded) onLoad()
        // `load` pode já ter passado (modelo em cache); o canActivateAR fica
        // correto pouco depois do primeiro frame de qualquer forma.
        setTimeout(() => { if (!disposed && visor) setCanAR(!!visor.canActivateAR) }, 1500)
      } else if (tries > 100 || disposed) {
        clearInterval(procurar)
      }
    }, 300)

    const semAR = () => {
      if (tentouAR.current) {
        tentouAR.current = false
        setSheet('sem-ar')
      }
    }
    const onHash = () => { if (location.hash === SINAL_SEM_AR) semAR() }
    const onVisible = () => { if (!document.hidden && location.hash === SINAL_SEM_AR) semAR() }
    window.addEventListener('hashchange', onHash)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      disposed = true
      clearInterval(procurar)
      window.removeEventListener('hashchange', onHash)
      document.removeEventListener('visibilitychange', onVisible)
      if (visor) {
        visor.removeEventListener('load', onLoad)
        visor.removeEventListener('ar-status', onArStatus)
      }
    }
  }, [productId])

  // QR para desktop/tablet: abre este produto direto no celular.
  useEffect(() => {
    if (canAR !== false || inApp) return
    const url = `${location.origin}${location.pathname}#p=${productId}`
    import('qrcode').then((QRCode) =>
      QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: '#1F1B1A', light: '#FFFFFF' } })
        .then(setQr)
        .catch(() => {})
    )
  }, [canAR, inApp, productId])

  function abrirCamera() {
    setSheet(null)
    tentouAR.current = true
    viewerRef.current?.activateAR()
  }

  function cliqueVerNaMesa() {
    if (!inApp) {
      setSheet('dicas')
      return
    }
    if (/Android/i.test(navigator.userAgent)) {
      const url = location.href.split('#')[0] + `#p=${productId}`
      location.href =
        'intent://' + url.replace(/^https?:\/\//, '') +
        '#Intent;scheme=https;action=android.intent.action.VIEW;S.browser_fallback_url=' +
        encodeURIComponent(url) + ';end'
      setTimeout(() => { if (!document.hidden) setSheet('navegador') }, 1500)
      return
    }
    setSheet('navegador')
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(location.href.split('#')[0] + `#p=${productId}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // sem clipboard — o texto do botão já mostra o domínio
    }
  }

  const apple = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)
  const mostraBotao = canAR !== false || inApp

  return (
    <div className="ar-viewer" id={`ar-host-${productId}`} ref={bindViewer}>
      <ModelViewer
        src={src}
        alt={alt}
        ar="true"
        ar-modes="webxr scene-viewer quick-look"
        ar-scale="fixed"
        ar-placement="floor"
        camera-controls="true"
        touch-action="pan-y"
        auto-rotate="true"
        auto-rotate-delay="1800"
        rotation-per-second="14deg"
        camera-orbit="30deg 65deg auto"
        shadow-intensity="1"
        shadow-softness="0.7"
        environment-image="neutral"
        exposure="1.05"
        interaction-prompt="none"
        style={{ width: '100%', height: '100%', minHeight: 220 }}
      />

      <div className="ar-viewer-bar">
        {sizeCm ? <span className="ar-viewer-size">{Math.round(sizeCm)} cm de largura — tamanho real</span> : <span />}
        {mostraBotao ? (
          <button type="button" className="ar-table-btn" onClick={cliqueVerNaMesa}>
            Ver na sua mesa
          </button>
        ) : (
          <span className="ar-viewer-hint">Arraste para girar o prato</span>
        )}
      </div>

      {canAR === false && !inApp && qr && (
        <div className="ar-qr-box">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code para abrir no celular" />
          <p>
            A câmera em 3D abre no celular (Chrome no Android, Safari no iPhone).
            Aponte a câmera para o código e o prato abre direto.
          </p>
        </div>
      )}

      {sheet === 'dicas' && (
        <Folha onClose={() => setSheet(null)} titulo="Antes de abrir a câmera">
          <p>Leva uns segundos para o celular encontrar a mesa.</p>
          <ol>
            <li><strong>Aponte para a mesa</strong><span>A uns 40 cm, com a luz acesa.</span></li>
            <li><strong>Mova o celular devagar</strong><span>De um lado para o outro, como quem varre a mesa.</span></li>
            <li><strong>Toque onde quer o prato</strong><span>Ele aparece ali, do tamanho que chega na mesa.</span></li>
          </ol>
          <button type="button" className="ar-table-btn ar-folha-cta" onClick={abrirCamera}>Abrir a câmera</button>
          <button type="button" className="ar-folha-fechar" onClick={() => setSheet(null)}>Agora não</button>
        </Folha>
      )}

      {sheet === 'sem-ar' && (
        <Folha onClose={() => setSheet(null)} titulo="A câmera em 3D não abriu">
          <p>No Android, a realidade aumentada usa dois apps do Google. Quase sempre é só atualizar um deles.</p>
          <ol>
            <li>
              <strong>Instale ou atualize os “Serviços do Google Play para RA”</strong>
              <span><a href={LOJA_ARCORE} target="_blank" rel="noopener">Abrir na Play Store</a></span>
            </li>
            <li>
              <strong>Atualize o app Google</strong>
              <span><a href={LOJA_GOOGLE} target="_blank" rel="noopener">Abrir na Play Store</a></span>
            </li>
            <li>
              <strong>Volte aqui pelo Chrome e tente de novo</strong>
              <span>Se o celular não for compatível com RA, o prato continua em 3D na tela.</span>
            </li>
          </ol>
          <button type="button" className="ar-table-btn ar-folha-cta" onClick={() => setSheet(null)}>Entendi</button>
        </Folha>
      )}

      {sheet === 'navegador' && (
        <Folha onClose={() => setSheet(null)} titulo="Abra no navegador do celular">
          <p>O navegador deste app não liga a câmera em 3D. São dois toques.</p>
          <ol>
            <li><strong>{apple ? 'Toque nos três pontinhos, embaixo à direita.' : 'Toque nos três pontinhos, em cima à direita.'}</strong></li>
            <li><strong>{apple ? 'Escolha “Abrir no navegador externo”.' : 'Escolha “Abrir no navegador” (Chrome).'}</strong></li>
          </ol>
          <button type="button" className="ar-table-btn ar-folha-cta" onClick={copiarLink}>
            {copied ? 'Link copiado' : 'Copiar o link'}
          </button>
          <button type="button" className="ar-folha-fechar" onClick={() => setSheet(null)}>Fechar</button>
        </Folha>
      )}
    </div>
  )
}

function Folha({ titulo, children, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="ar-folha-fundo" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ar-folha" role="dialog" aria-modal="true">
        <h3>{titulo}</h3>
        {children}
      </div>
    </div>
  )
}
