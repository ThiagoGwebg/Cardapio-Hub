'use client'

import { useState } from 'react'

const TYPE_LABEL: Record<string, string> = {
  cpf_cnpj: 'CPF/CNPJ',
  email: 'E-mail',
  phone: 'Telefone',
  random: 'Chave aleatória',
}

const TYPE_PLACEHOLDER: Record<string, string> = {
  cpf_cnpj: '000.000.000-00',
  email: 'sualoja@email.com',
  phone: '(11) 91234-5678',
  random: '123e4567-e89b-12d3-a456-426614174000',
}

export default function PixKeyField({
  defaultType,
  defaultValue,
}: {
  defaultType: string | null
  defaultValue: string | null
}) {
  const [type, setType] = useState(defaultType || 'email')

  return (
    <div className="form-group" style={{ marginTop: 8 }}>
      <label className="form-label">Chave Pix (dinheiro cai direto na sua conta)</label>
      <div className="form-row">
        <div className="form-group" style={{ flex: '0 0 150px' }}>
          <select className="form-input" name="pixKeyType" value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <input
            className="form-input"
            name="pixKey"
            defaultValue={defaultValue ?? ''}
            placeholder={TYPE_PLACEHOLDER[type]}
          />
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
        Essa é só a sua chave Pix — não pedimos dado bancário nenhum. O Cardápio Hub não recebe nem retém esse
        dinheiro; ele cai direto na sua conta quando o cliente paga.
      </p>
    </div>
  )
}
