'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  storeId: string
  kind: 'logo' | 'banner' | 'product'
  name: string
  label: string
  hint?: string
  defaultUrl?: string
}

const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
}

export default function ImageUploadField({ storeId, kind, name, label, hint, defaultUrl }: Props) {
  const [url, setUrl] = useState(defaultUrl || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    if (!EXT[file.type]) {
      setError('Use uma imagem PNG, JPG, WEBP, GIF ou SVG.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter até 5 MB.')
      return
    }

    setBusy(true)
    try {
      const supabase = createClient()
      const ext = EXT[file.type]
      const path = `${storeId}/${kind}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('store-assets')
        .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type })
      if (upErr) throw upErr

      const { data } = supabase.storage.from('store-assets').getPublicUrl(path)
      setUrl(data.publicUrl)
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
