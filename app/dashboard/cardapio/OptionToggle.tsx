'use client'

import { useTransition } from 'react'
import { toggleOption } from './actions'

export default function OptionToggle({
  productId,
  optionId,
  isActive,
}: {
  productId: string
  optionId: string
  isActive: boolean
}) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="ci-toggle-wrap">
      <span className={`ci-toggle-label ${isActive ? '' : 'ci-lbl-off'}`}>
        {isActive ? 'Disponível' : 'Esgotado'}
      </span>
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
  )
}
