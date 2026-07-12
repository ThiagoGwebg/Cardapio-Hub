'use client'

import { useRef, useState, useTransition } from 'react'
import { fmtCents } from '@/lib/format'
import { setOptionImage, setOptionDescription, toggleOption, deleteOption } from './actions'

const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml']

export default function OptionEditor({
  productId,
  optionId,
  name,
  priceDeltaCents,
  isActive,
  imageUrl,
  description,
}: {
  productId: string
  optionId: string
  name: string
  priceDeltaCents: number
  isActive: boolean
  imageUrl: string | null
  description: string | null
}) {
  const [img, setImg] = useState<string | null>(imageUrl)
  const [desc, setDesc] = useState(description ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    setError(null)
    if (!ALLOWED.includes(file.type)) return setError('Use imagens PNG, JPG, WEBP, GIF ou SVG.')
    if (file.size > 5 * 1024 * 1024) return setError('A imagem deve ter até 5 MB.')

    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', 'product')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || 'Falha no upload.')
        return
      }
      setImg(json.url)
      startTransition(() => setOptionImage(productId, optionId, json.url))
    } finally {
      setBusy(false)
    }
  }

  function removeImage() {
    setImg(null)
    startTransition(() => setOptionImage(productId, optionId, null))
  }

  function saveDesc() {
    if ((desc.trim() || null) === (description ?? null)) return
    startTransition(() => setOptionDescription(productId, optionId, desc))
  }

  return (
    <div className="cardapio-item opt-editor">
      {/* Miniatura / upload */}
      <div className="opt-thumb">
        {img ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt={name} />
            <button type="button" className="opt-thumb-x" onClick={removeImage} aria-label="Remover foto">×</button>
          </>
        ) : (
          <button
            type="button"
            className="opt-thumb-add"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            title="Adicionar foto"
          >
            {busy ? '…' : '＋'}
            <span>{busy ? '' : 'foto'}</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          style={{ display: 'none' }}
          onChange={onPick}
        />
      </div>

      <div className="ci-info" style={{ minWidth: 0 }}>
        <div className="ci-name">
          {name}
          {!isActive && <span className="sold-out-badge">Esgotado</span>}
        </div>
        <div className="ci-cat">{priceDeltaCents > 0 ? `+ ${fmtCents(priceDeltaCents)}` : 'sem acréscimo'}</div>
        <input
          className="form-input opt-desc-input"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={saveDesc}
          placeholder="Descrição curta (ex.: recheio de frango)"
          maxLength={80}
        />
        {error && <p className="upload-error" style={{ marginTop: 4 }}>{error}</p>}
      </div>

      <div className="ci-toggle-wrap">
        <span className={`ci-toggle-label ${isActive ? '' : 'ci-lbl-off'}`}>{isActive ? 'Disponível' : 'Esgotado'}</span>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={isActive}
            disabled={pending}
            onChange={(e) => startTransition(() => toggleOption(productId, optionId, e.target.checked))}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>

      <button
        type="button"
        className="ordertype-btn"
        style={{ flex: 'none', padding: '6px 12px' }}
        disabled={pending}
        onClick={() => startTransition(() => deleteOption(productId, optionId))}
      >
        Remover
      </button>
    </div>
  )
}
