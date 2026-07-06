'use client'

import { useRef, useState } from 'react'

type Props = {
  kind: 'logo' | 'banner' | 'product'
  name: string
  label: string
  hint?: string
  defaultUrl?: string
}

const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml']

export default function ImageUploadField({ kind, name, label, hint, defaultUrl }: Props) {
  const [url, setUrl] = useState(defaultUrl || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    if (!ALLOWED.includes(file.type)) {
      setError('Use uma imagem PNG, JPG, WEBP, GIF ou SVG.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter até 5 MB.')
      return
    }

    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', kind)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Falha no upload. Tente novamente.')
      setUrl(json.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no upload. Tente novamente.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const isBanner = kind === 'banner'
  const emptyText = kind === 'banner' ? 'Sem banner' : kind === 'product' ? 'Sem foto' : 'Sem logo'

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input type="hidden" name={name} value={url} />

      <div className={`upload-field ${isBanner ? 'upload-field-banner' : ''}`}>
        <div className={`upload-preview ${isBanner ? 'upload-preview-banner' : 'upload-preview-logo'}`}>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={label} />
          ) : (
            <span className="upload-preview-empty">{emptyText}</span>
          )}
        </div>

        <div className="upload-actions">
          <button
            type="button"
            className="ordertype-btn"
            style={{ flex: 'none' }}
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? 'Enviando…' : url ? 'Trocar imagem' : 'Enviar imagem'}
          </button>
          {url && !busy && (
            <button
              type="button"
              className="ordertype-btn"
              style={{ flex: 'none' }}
              onClick={() => setUrl('')}
            >
              Remover
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        style={{ display: 'none' }}
        onChange={onPick}
      />
      {hint && <p className="upload-hint">{hint}</p>}
      {error && <p className="upload-error">{error}</p>}
    </div>
  )
}
