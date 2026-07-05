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

        <div className="l-lead-frame">
          <form className="l-lead-card" action={formAction}>
            <label className="l-lead-label" htmlFor="lead-name">Nome</label>
            <input className="l-lead-input" id="lead-name" name="name" placeholder="Nome" required />

            <label className="l-lead-label" htmlFor="lead-company">Empresa</label>
            <input className="l-lead-input" id="lead-company" name="company" placeholder="Empresa" />

            <label className="l-lead-label" htmlFor="lead-email">E-mail</label>
            <input className="l-lead-input" id="lead-email" name="email" type="email" placeholder="E-mail" required />

            <label className="l-lead-label" htmlFor="lead-whatsapp">WhatsApp</label>
            <input className="l-lead-input" id="lead-whatsapp" name="whatsapp" placeholder="WhatsApp" />

            <label className="l-lead-label" htmlFor="lead-revenue">Faturamento mensal</label>
            <select className="l-lead-input l-lead-select" id="lead-revenue" name="monthlyRevenue" defaultValue="">
              <option value="" disabled>Selecionar</option>
              {REVENUE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>

            <label className="l-lead-label" htmlFor="lead-segment">Qual o seu segmento</label>
            <select className="l-lead-input l-lead-select" id="lead-segment" name="segment" defaultValue="">
              <option value="" disabled>Selecionar</option>
              {SEGMENT_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>

            {state.error && <p className="l-lead-error">{state.error}</p>}

            <label className="l-lead-consent">
              <input type="checkbox" name="consent" required />
              <span>
                Declaro que li e aceito a{' '}
                <Link href="/privacidade" target="_blank">Política de privacidade</Link>.
              </span>
            </label>

            <button className="l-lead-submit" type="submit" disabled={pending}>
              {pending ? 'Enviando...' : <>TESTE AGORA <span aria-hidden="true">→</span></>}
            </button>
          </form>
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
