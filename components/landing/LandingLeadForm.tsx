'use client'

import { useActionState } from 'react'
import { submitLead, type LeadFormState } from '@/app/actions/leads'

const REVENUE_OPTIONS = [
  'Não sei',
  'Não tem faturamento',
  'Menos de R$1000',
  'R$1.001 à R$5.000',
  'R$5.001 à R$10.000',
  'R$10.001 à R$20.000',
  'R$20.001 à R$30.000',
  'R$30.001 à R$50.000',
  'R$50.001 à R$100.000',
  'Acima de R$100.000',
]

const SEGMENT_OPTIONS = [
  'Pizzaria',
  'Hamburgueria',
  'Restaurante',
  'Lanchonete',
  'Confeitaria',
  'Açaiteria',
  'Sushi',
  'Marmitaria',
  'Pastelaria',
  'Outro',
]

const initialState: LeadFormState = { ok: false }

export default function LandingLeadForm() {
  const [state, formAction, pending] = useActionState(submitLead, initialState)

  if (state.ok) {
    return (
      <div className="l-lead-frame">
        <div className="l-lead-card l-lead-success">
          <div className="l-lead-success-title">Recebemos seus dados!</div>
          <p className="l-lead-success-desc">
            Alguém do nosso time vai te chamar no WhatsApp em instantes pra te ajudar a colocar
            sua loja no ar.
          </p>
        </div>
      </div>
    )
  }

  return (
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
            Declaro que li e aceito a <a href="#">Política de privacidade</a>.
          </span>
        </label>

        <button className="l-lead-submit" type="submit" disabled={pending}>
          {pending ? 'Enviando...' : <>TESTE AGORA <span aria-hidden="true">→</span></>}
        </button>
      </form>
    </div>
  )
}
