'use client'

import { useState, useTransition } from 'react'
import ProductImagesField from '@/components/ProductImagesField'

export default function NewProductForm({
  action,
  defaultCategory,
}: {
  action: (formData: FormData) => Promise<void>
  defaultCategory?: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [formKey, setFormKey] = useState(0)

  if (!open) {
    return (
      <button type="button" className="prod-add-trigger" onClick={() => setOpen(true)}>
        <span className="prod-add-plus" aria-hidden>＋</span>
        <span className="prod-add-text">
          <span className="prod-add-title">Adicionar produto</span>
          <span className="prod-add-sub">Nome, preço, foto e categoria</span>
        </span>
      </button>
    )
  }

  return (
    <div className="prod-form-card">
      <div className="prod-form-head">
        <span className="prod-form-title">Novo produto</span>
        <button type="button" className="prod-form-close" onClick={() => setOpen(false)} aria-label="Fechar">
          ✕
        </button>
      </div>

      <form
        key={formKey}
        action={(fd) =>
          start(async () => {
            await action(fd)
            setFormKey((k) => k + 1)
            setOpen(false)
          })
        }
        className="prod-form"
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Nome</label>
            <input className="form-input" name="name" placeholder="Ex.: Coxinha de frango" required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Categoria</label>
            <input className="form-input" name="category" defaultValue={defaultCategory} placeholder="Ex.: Salgados" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Preço (R$)</label>
            <input className="form-input" name="price" type="number" step="0.01" min="0" placeholder="0,00" required />
          </div>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <input className="form-input" name="description" placeholder="Aparece abaixo do nome (opcional)" />
          </div>
        </div>
        <ProductImagesField
          name="images"
          label="Fotos do produto (opcional)"
          hint="A 1ª foto é a capa. Quadradas (600×600) ficam melhor. Até 5 MB cada."
          max={6}
        />
        <div className="prod-form-actions">
          <button className="save-btn" type="submit" disabled={pending}>
            {pending ? 'Salvando…' : 'Adicionar produto'}
          </button>
          <button type="button" className="prod-form-cancel" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
