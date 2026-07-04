'use client'

export default function CopyField({ value }: { value: string }) {
  return (
    <div className="link-row">
      <input className="form-input" type="text" value={value} readOnly />
      <button
        type="button"
        className="copy-btn"
        onClick={() => navigator.clipboard.writeText(value)}
      >
        Copiar
      </button>
    </div>
  )
}
