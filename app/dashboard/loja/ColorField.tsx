'use client'

import { useState } from 'react'

type Props = {
  name: string
  label: string
  hint?: string
  defaultValue: string
}

/**
 * Seletor de cor com prévia ao vivo do valor hex escolhido.
 * O valor é enviado no form pelo próprio <input type="color"> (name).
 */
export default function ColorField({ name, label, hint, defaultValue }: Props) {
  const [color, setColor] = useState(defaultValue)

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="color-field">
        <input
          className="color-field-swatch"
          type="color"
          name={name}
          value={color}
          onChange={(e) => setColor(e.target.value)}
          aria-label={label}
        />
        <span className="color-field-value">{color.toUpperCase()}</span>
      </div>
      {hint && <p className="color-field-hint">{hint}</p>}
    </div>
  )
}
