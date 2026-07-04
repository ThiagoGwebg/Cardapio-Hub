'use client'

import { useTransition } from 'react'
import { toggleProduct } from './actions'

export default function ProductToggle({ productId, isActive }: { productId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="ci-toggle-wrap">
      <span className={`ci-toggle-label ${isActive ? '' : 'ci-lbl-off'}`}>
        {isActive ? 'Ativo' : 'Inativo'}
      </span>
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={isActive}
          disabled={pending}
          onChange={(e) => startTransition(() => toggleProduct(productId, e.target.checked))}
        />
        <span className="toggle-slider"></span>
      </label>
    </div>
  )
}
