'use client'

import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'

type Props = {
  name: string
  label: string
  hint?: string
  defaultUrls?: string[]
  max?: number
}

const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml']

const thumbStyle: CSSProperties = {
  position: 'relative',
  width: 92,
  height: 92,
  borderRadius: 10,
  overflow: 'hidden',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  flexShrink: 0,
}

export default function ProductImagesField({ name, label, hint, defaultUrls = [], max = 6 }: Props) {
  const [urls, setUrls] = useState<string[]>(defaultUrls.filter(Boolean))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const remaining = max - urls.length

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (inputRef.current) inputRef.current.value = ''
    if (!files.length) return
    setError(null)

    const toUpload = files.slice(0, remaining)
    if (files.length > remaining) {
      setError(`Você pode ter no máximo ${max} fotos. Enviei as ${remaining} primeiras.`)
    }

    setBusy(true)
    const uploaded: string[] = []
    try {
      for (const file of toUpload) {
        if (!ALLOWED.includes(file.type)) {
          setError('Use imagens PNG, JPG, WEBP, GIF ou SVG.')
          continue
        }
        if (file.size > 5 * 1024 * 1024) {
          setError('Cada imagem deve ter até 5 MB.')
          continue
        }
        const fd = new FormData()
        fd.append('file', file)
        fd.append('kind', 'product')
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(json.error || 'Falha no upload de uma imagem.')
          continue
        }
        uploaded.push(json.url)
      }
      if (uploaded.length) setUrls((prev) => [...prev, ...uploaded].slice(0, max))
    } finally {
      setBusy(false)
    }
  }

  function removeAt(i: number) {
    setUrls((prev) => prev.filter((_, idx) => idx !== i))
  }
  function makeCover(i: number) {
    setUrls((prev) => {
      if (i <= 0 || i >= prev.length) return prev
      const copy = [...prev]
      const [pick] = copy.splice(i, 1)
      return [pick, ...copy]
    })
  }

  return (
    <div className="form-group">
      <label className="form-label">
        {label} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({urls.length}/{max})</span>
      </label>
      <input type="hidden" name={name} value={JSON.stringify(urls)} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
        {urls.map((u, i) => (
          <div key={u + i} style={thumbStyle}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt={`Foto ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {i === 0 ? (
              <span
                style={{
                  position: 'absolute', top: 4, left: 4, background: 'var(--primary)', color: '#fff',
                  fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                }}
              >
                Capa
              </span>
            ) : (
              <button
                type="button"
                onClick={() => makeCover(i)}
                title="Tornar capa"
                style={{
                  position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.6)', color: '#fff',
                  fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, border: 'none', cursor: 'pointer',
                }}
              >
                ★ capa
              </button>
            )}
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label="Remover foto"
              style={{
                position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 999,
                background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer',
                fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>
        ))}

        {remaining > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            style={{
              ...thumbStyle,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 4, cursor: busy ? 'default' : 'pointer', color: 'var(--muted)', borderStyle: 'dashed',
            }}
          >
            <span style={{ fontSize: 24, lineHeight: 1 }}>{busy ? '…' : '+'}</span>
            <span style={{ fontSize: 11 }}>{busy ? 'Enviando' : 'Add foto'}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        style={{ display: 'none' }}
        onChange={onPick}
      />
      {hint && <p className="upload-hint">{hint}</p>}
      {error && <p className="upload-error">{error}</p>}
    </div>
  )
}
