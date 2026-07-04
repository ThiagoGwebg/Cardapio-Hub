'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signup } from './actions'

type State = { error: string | null; message?: string }

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) => (await signup(formData)) ?? { error: null },
    { error: null }
  )

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <form
        action={formAction}
        className="settings-card"
        style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 22 }}>
          Criar minha loja
        </h1>

        <div className="form-group">
          <label className="form-label" htmlFor="storeName">Nome da loja</label>
          <input className="form-input" id="storeName" name="storeName" required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="whatsapp">WhatsApp (opcional)</label>
          <input className="form-input" id="whatsapp" name="whatsapp" placeholder="(19) 99999-9999" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="email">E-mail</label>
          <input className="form-input" id="email" name="email" type="email" required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="password">Senha</label>
          <input className="form-input" id="password" name="password" type="password" minLength={6} required />
        </div>

        {state.error && <p style={{ color: 'var(--red)', fontSize: 12 }}>{state.error}</p>}
        {state.message && <p style={{ color: 'var(--green)', fontSize: 12 }}>{state.message}</p>}

        <button className="save-btn" type="submit" disabled={pending}>
          {pending ? 'Criando...' : 'Criar loja'}
        </button>

        <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          Já tem loja? <Link href="/login" style={{ color: 'var(--primary)' }}>Entrar</Link>
        </p>
      </form>
    </div>
  )
}
