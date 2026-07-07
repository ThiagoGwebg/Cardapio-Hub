'use client'

import { useActionState } from 'react'
import Link from 'next/link'
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
      <div className="l-lead-frame l-lead-frame-wa">
        <div className="l-lead-card l-lead-success l-lead-success-wa">
          <div className="l-wa-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.885 3.488" />
            </svg>
          </div>
          <div className="l-lead-success-title">Recebemos seus dados!</div>
          <p className="l-lead-success-desc">
            Em breve <strong>entraremos em contato pelo WhatsApp</strong> pra te ajudar a colocar
            sua loja no ar. Fica de olho nas suas mensagens! 💬
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
            Declaro que li e aceito a{' '}
            <Link href="/privacidade" target="_blank">Política de privacidade</Link>.
          </span>
        </label>

        <button className="l-lead-submit" type="submit" disabled={pending}>
          {pending ? 'Enviando...' : <>TESTE AGORA <span aria-hidden="true">→</span></>}
        </button>
      </form>
    </div>
  )
}
