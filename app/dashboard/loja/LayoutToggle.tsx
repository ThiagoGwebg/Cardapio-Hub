'use client'

import { useState } from 'react'
import { MENU_LAYOUTS, type MenuLayout } from '@/lib/storeTheme'

/**
 * Toggle visual entre os layouts do cardápio (Lista x Grade).
 * O valor selecionado é enviado no form por um input hidden (name).
 */
export default function LayoutToggle({
  name,
  defaultValue,
}: {
  name: string
  defaultValue: MenuLayout
}) {
  const [layout, setLayout] = useState<MenuLayout>(defaultValue)

  return (
    <div className="form-group">
      <label className="form-label">Layout do cardápio</label>
      <input type="hidden" name={name} value={layout} />
      <div className="layout-toggle">
        {MENU_LAYOUTS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`layout-option ${layout === opt.value ? 'active' : ''}`}
            onClick={() => setLayout(opt.value)}
            aria-pressed={layout === opt.value}
          >
            <span className={`layout-option-preview preview-${opt.value}`} aria-hidden>
              <span />
              <span />
              <span />
            </span>
            <span className="layout-option-label">{opt.label}</span>
            <span className="layout-option-hint">{opt.hint}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
