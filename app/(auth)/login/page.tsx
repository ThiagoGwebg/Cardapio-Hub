'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { login } from './actions'
import LandingThemeWrapper from '@/components/landing/LandingThemeWrapper'
import LandingThemeToggle from '@/components/landing/LandingThemeToggle'

type State = { error: string | null }

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) => (await login(formData)) ?? { error: null },
    { error: null }
  )

  return (
    <LandingThemeWrapper>
      <header className="l-nav">
        <Link href="/" className="l-logo">
          cardápio<em>ágil</em>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <LandingThemeToggle />
          <Link href="/" className="l-btn-ghost">← Voltar</Link>
        </div>
      </header>

      <div
        style={{
          minHeight: 'calc(100vh - 65px)',
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
          Entrar
        </h1>

        <div className="form-group">
          <label className="form-label" htmlFor="email">E-mail</label>
          <input className="form-input" id="email" name="email" type="email" required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="password">Senha</label>
          <input className="form-input" id="password" name="password" type="password" required />
        </div>

        {state.error && <p style={{ color: 'var(--red)', fontSize: 12 }}>{state.error}</p>}

        <button className="save-btn" type="submit" disabled={pending}>
          {pending ? 'Entrando...' : 'Entrar'}
        </button>

        <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          Ainda não tem loja? <Link href="/contato" style={{ color: 'var(--primary)' }}>Fale com a gente</Link>
        </p>
      </form>
      </div>
    </LandingThemeWrapper>
  )
}
