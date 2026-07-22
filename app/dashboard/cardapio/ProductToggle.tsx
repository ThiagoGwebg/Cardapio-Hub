'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { toggleProduct } from './actions'

export default function ProductToggle({ productId, isActive }: { productId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition()

  function handleChange(checked: boolean) {
    startTransition(async () => {
      await toggleProduct(productId, checked)
      toast.success(checked ? 'Produto disponível novamente.' : 'Produto marcado como esgotado.')
    })
  }

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
          onChange={(e) => handleChange(e.target.checked)}
        />
        <span className="toggle-slider"></span>
      </label>
    </div>
  )
}
