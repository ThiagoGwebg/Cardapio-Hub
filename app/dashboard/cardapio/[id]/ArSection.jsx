'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ModelViewer from '@/components/ModelViewer'
import { publishArModel, discardArGeneration, removeArModel } from '../ar-actions'

/**
 * Seção "Realidade aumentada" da edição do produto (exclusiva do Pro).
 *
 * Fluxo: o lojista envia até 4 fotos de vista (frente obrigatória), informa a
 * largura real do prato e dispara a geração. A IA leva uns minutos; a seção
 * fica em polling e, quando o modelo sai, mostra o 3D girando para o lojista
 * aprovar ("Publicar no cardápio") ou descartar. Nada vai pro cliente sem
 * essa aprovação.
 */

const VIEWS = [
  { key: 'front', label: 'Frente', required: true },
  { key: 'left', label: 'Lado esquerdo' },
  { key: 'back', label: 'Trás' },
  { key: 'right', label: 'Lado direito' },
]

export default function ArSection({ productId, plan, enabled, usage, latestGen, publishedUrl, publishedSizeCm }) {
  const router = useRouter()
  const [gen, setGen] = useState(latestGen)
  const [photos, setPhotos] = useState({})
  const [sizeCm, setSizeCm] = useState('')
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const pollRef = useRef(null)

  const processing = gen?.status === 'processing'

  // Polling enquanto a IA trabalha. O próprio GET /status faz o fechamento
  // (baixa e salva o .glb) quando a Tripo termina.
  useEffect(() => {
    if (!processing) return
    let stopped = false
    async function tick() {
      try {
        const res = await fetch(`/api/ar/status?id=${gen.id}`)
        const json = await res.json()
        if (stopped) return
        if (res.ok) {
          if (typeof json.progress === 'number') setProgress(json.progress)
          if (json.status !== 'processing') {
            setGen(json)
            setProgress(null)
            return
          }
        }
      } catch {
        // rede oscilou — tenta de novo no próximo tick
      }
      pollRef.current = setTimeout(tick, 5000)
    }
    tick()
    return () => {
      stopped = true
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [processing, gen?.id])

  async function uploadPhoto(view, file) {
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('kind', 'ar')
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || 'Falha no upload.')
    setPhotos((p) => ({ ...p, [view]: json.url }))
  }

  async function startGeneration() {
    setError(null)
    const size = Number(String(sizeCm).replace(',', '.'))
    if (!photos.front) return setError('A foto de frente é obrigatória.')
    if (Object.keys(photos).length < 2) return setError('Envie pelo menos 2 fotos (frente + um lado).')
    if (!Number.isFinite(size) || size < 3 || size > 120) {
      return setError('Informe a largura real do prato, entre 3 e 120 cm.')
    }
    setStarting(true)
    try {
      const res = await fetch('/api/ar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, sizeCm: size, photos }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Não deu pra iniciar a geração.')
      setGen({ id: json.id, status: 'processing' })
      setProgress(0)
      setShowForm(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não deu pra iniciar a geração.')
    } finally {
      setStarting(false)
    }
  }

  // ── Plano sem acesso: teaser ──
  if (plan !== 'pro') {
    return (
      <div className="settings-card">
        <div className="settings-section-title">Realidade aumentada <span className="ar-pro-badge">Pro</span></div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
          Com 4 fotos do prato, a IA cria um modelo 3D e o cliente <b>vê o prato na própria mesa</b>,
          em tamanho real, pela câmera do celular. Nenhum outro cardápio da região vai ter isso.
        </p>
        <Link href="/dashboard/billing" className="save-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
          Conhecer o plano Pro
        </Link>
      </div>
    )
  }

  if (!enabled) {
    return (
      <div className="settings-card">
        <div className="settings-section-title">Realidade aumentada <span className="ar-pro-badge">Pro</span></div>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          A geração de modelos 3D está temporariamente indisponível. Tente mais tarde.
        </p>
      </div>
    )
  }

  const quotaLeft = Math.max(0, usage.limit - usage.used)
  const formVisible = showForm || (!publishedUrl && !processing && gen?.status !== 'ready')

  return (
    <div className="settings-card">
      <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        Realidade aumentada <span className="ar-pro-badge">Pro</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>
          {usage.used} de {usage.limit} gerações no mês
        </span>
      </div>

      {/* ── Modelo publicado ── */}
      {publishedUrl && (
        <div className="ar-preview-block">
          <ModelViewer
            src={publishedUrl}
            camera-controls="true"
            auto-rotate="true"
            shadow-intensity="1"
            style={{ width: '100%', height: 260, background: 'var(--surface2, #f4f4f4)', borderRadius: 12 }}
          />
          <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '8px 0 12px' }}>
            Publicado no cardápio — os clientes já veem o prato em 3D e na mesa
            {publishedSizeCm ? ` (${Math.round(publishedSizeCm)} cm de largura)` : ''}.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <form action={removeArModel.bind(null, productId)}>
              <button type="submit" className="ordertype-btn" style={{ flex: 'none' }}>Tirar do cardápio</button>
            </form>
            {!formVisible && !processing && gen?.status !== 'ready' && (
              <button type="button" className="ordertype-btn" style={{ flex: 'none' }} onClick={() => setShowForm(true)} disabled={quotaLeft === 0}>
                Gerar novo modelo
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Em processamento ── */}
      {processing && (
        <div className="ar-processing">
          <div className="ar-processing-spinner" aria-hidden />
          <div>
            <b>Gerando o modelo 3D…</b>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '2px 0 0' }}>
              Leva de 2 a 5 minutos{typeof progress === 'number' ? ` — ${progress}%` : ''}. Pode sair da página; o
              resultado fica aqui te esperando.
            </p>
          </div>
        </div>
      )}

      {/* ── Pronto para revisão ── */}
      {gen?.status === 'ready' && gen.model_url && (
        <div className="ar-preview-block">
          <ModelViewer
            src={gen.model_url}
            camera-controls="true"
            auto-rotate="true"
            shadow-intensity="1"
            style={{ width: '100%', height: 300, background: 'var(--surface2, #f4f4f4)', borderRadius: 12 }}
          />
          <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '8px 0 12px' }}>
            Gire e confira o modelo. Só vai pro cardápio se você publicar.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <form action={publishArModel.bind(null, productId, gen.id)} onSubmit={() => setTimeout(() => router.refresh(), 400)}>
              <button type="submit" className="save-btn" style={{ marginBottom: 0 }}>Publicar no cardápio</button>
            </form>
            <form
              action={discardArGeneration.bind(null, productId, gen.id)}
              onSubmit={() => { setGen(null); setShowForm(true); setTimeout(() => router.refresh(), 400) }}
            >
              <button type="submit" className="ordertype-btn" style={{ flex: 'none' }}>Descartar</button>
            </form>
          </div>
        </div>
      )}

      {/* ── Falhou ── */}
      {gen?.status === 'failed' && (
        <p className="upload-error" style={{ marginBottom: 10 }}>
          {gen.error || 'A geração falhou. Tente de novo — esta tentativa não consumiu sua cota.'}
        </p>
      )}

      {/* ── Formulário de geração ── */}
      {formVisible && !processing && (
        <div className="ar-form">
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 12px' }}>
            Tire as fotos <b>do mesmo prato, na mesma mesa</b>, girando ao redor dele: frente,
            lado esquerdo, trás e lado direito. Fundo limpo e boa luz melhoram muito o resultado.
          </p>
          <div className="ar-photo-grid">
            {VIEWS.map((v) => (
              <ArPhotoSlot
                key={v.key}
                label={v.label}
                required={v.required}
                url={photos[v.key]}
                onFile={(f) => uploadPhoto(v.key, f).catch((e) => setError(e.message))}
                onClear={() => setPhotos((p) => { const n = { ...p }; delete n[v.key]; return n })}
              />
            ))}
          </div>
          <div className="form-row" style={{ marginTop: 12, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ maxWidth: 220 }}>
              <label className="form-label">Largura real do prato (cm)</label>
              <input
                className="form-input"
                type="number"
                min="3"
                max="120"
                step="0.5"
                placeholder="Ex.: 26"
                value={sizeCm}
                onChange={(e) => setSizeCm(e.target.value)}
              />
            </div>
            <div className="form-group">
              <button
                type="button"
                className="save-btn"
                style={{ marginBottom: 0 }}
                disabled={starting || quotaLeft === 0}
                onClick={startGeneration}
              >
                {starting ? 'Enviando…' : 'Gerar modelo 3D'}
              </button>
            </div>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>
            A largura é o que faz o prato aparecer na mesa do cliente no tamanho certo — meça a boca
            do prato ou da embalagem. {quotaLeft === 0 ? 'Sua cota do mês acabou; renova no dia 1º.' : `Restam ${quotaLeft} gerações neste mês.`}
          </p>
          {error && <p className="upload-error">{error}</p>}
        </div>
      )}
    </div>
  )
}

function ArPhotoSlot({ label, required, url, onFile, onClear }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)

  return (
    <div className={`ar-photo-slot ${url ? 'has-photo' : ''}`}>
      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} />
          <button type="button" className="ar-photo-clear" onClick={onClear} aria-label={`Remover foto ${label}`}>×</button>
        </>
      ) : (
        <button
          type="button"
          className="ar-photo-add"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? 'Enviando…' : '+ Foto'}
        </button>
      )}
      <span className="ar-photo-label">
        {label}
        {required ? ' *' : ''}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (!f) return
          setBusy(true)
          try {
            await onFile(f)
          } finally {
            setBusy(false)
            if (inputRef.current) inputRef.current.value = ''
          }
        }}
      />
    </div>
  )
}
