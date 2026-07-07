'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'

type Mode = 'one' | 'multi' | 'custom'

const PRESETS: { key: Mode; title: string; sub: string }[] = [
  { key: 'one', title: 'Escolher 1', sub: 'obrigatório · ex.: Tamanho, Ponto da carne' },
  { key: 'multi', title: 'Escolher vários', sub: 'opcional · ex.: Adicionais, Salgadinhos' },
  { key: 'custom', title: 'Personalizado', sub: 'eu defino os limites' },
]

function presetStyle(active: boolean): CSSProperties {
  return {
    flex: 1,
    minWidth: 150,
    textAlign: 'left',
    cursor: 'pointer',
    border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
    background: active ? 'var(--primary-l)' : 'transparent',
    color: 'var(--text)',
    borderRadius: 8,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  }
}

export default function GroupPresetFields() {
  const [mode, setMode] = useState<Mode>('one')
  const [min, setMin] = useState(1)
  const [max, setMax] = useState(1)
  const [required, setRequired] = useState(true)

  function pick(m: Mode) {
    setMode(m)
    if (m === 'one') {
      setMin(1)
      setMax(1)
      setRequired(true)
    } else if (m === 'multi') {
      setMin(0)
      setMax(8)
      setRequired(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {PRESETS.map((p) => (
          <button key={p.key} type="button" onClick={() => pick(p.key)} style={presetStyle(mode === p.key)}>
            <b style={{ fontSize: 13.5 }}>{p.title}</b>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{p.sub}</span>
          </button>
        ))}
      </div>

      {mode !== 'custom' ? (
        <>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>
            {mode === 'one'
              ? 'O cliente escolhe exatamente 1 opção — e é obrigatório escolher.'
              : `O cliente pode escolher de 0 até ${max} opções (opcional).`}
          </p>
          <input type="hidden" name="minSelect" value={min} readOnly />
          <input type="hidden" name="maxSelect" value={max} readOnly />
          {required && <input type="hidden" name="required" value="on" readOnly />}
          {mode === 'multi' && (
            <div className="form-group" style={{ maxWidth: 200 }}>
              <label className="form-label">Máximo que pode escolher</label>
              <input
                className="form-input"
                type="number"
                min={1}
                value={max}
                onChange={(e) => setMax(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
          )}
        </>
      ) : (
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Mín. escolhas</label>
            <input
              className="form-input"
              name="minSelect"
              type="number"
              min={0}
              value={min}
              onChange={(e) => setMin(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Máx. escolhas</label>
            <input
              className="form-input"
              name="maxSelect"
              type="number"
              min={1}
              value={max}
              onChange={(e) => setMax(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <label className="toggle-row" style={{ padding: 0 }}>
              <span className="toggle-label">Obrigatório</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  name="required"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
