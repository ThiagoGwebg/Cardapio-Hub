'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { submitCourier, type CourierFormState } from '@/app/actions/couriers'

const VEHICLE_OPTIONS = [
  'Moto / Motocicleta',
  'Bicicleta / Bicicleta Elétrica',
  'Carro / Automóvel',
  'Outro',
]

const PIX_OPTIONS = [
  'CPF',
  'Celular',
  'E-mail',
  'Chave Aleatória',
]

const AVAILABILITY_OPTIONS = [
  'Integral (Almoço e Jantar)',
  'Almoço (11h às 14h)',
  'Jantar (18h às 23h)',
  'Apenas finais de semana',
]

const initialState: CourierFormState = { ok: false }

export default function LandingCourierForm() {
  const [state, formAction, pending] = useActionState(submitCourier, initialState)

  if (state.ok) {
    return (
      <div className="l-lead-frame l-lead-frame-wa">
        <div className="l-lead-card l-lead-success l-lead-success-wa">
          <div className="l-wa-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
            </svg>
          </div>
          <div className="l-lead-success-title">Cadastro realizado com sucesso!</div>
          <p className="l-lead-success-desc">
            Obrigado pelo seu interesse! Guardamos os seus dados e <strong>entraremos em contato pelo WhatsApp</strong> assim que tivermos vagas de entrega na sua região. 💬
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="l-lead-frame">
      <form className="l-lead-card" action={formAction}>
        <label className="l-lead-label" htmlFor="courier-name">Nome Completo</label>
        <input className="l-lead-input" id="courier-name" name="name" placeholder="Ex: João Silva" required />

        <label className="l-lead-label" htmlFor="courier-email">E-mail</label>
        <input className="l-lead-input" id="courier-email" name="email" type="email" placeholder="Ex: joao@email.com" required />

        <label className="l-lead-label" htmlFor="courier-whatsapp">WhatsApp (com DDD)</label>
        <input className="l-lead-input" id="courier-whatsapp" name="whatsapp" placeholder="Ex: (11) 99999-9999" required />

        <label className="l-lead-label" htmlFor="courier-city">Cidade e Estado</label>
        <input className="l-lead-input" id="courier-city" name="city" placeholder="Ex: São Paulo - SP" required />

        <label className="l-lead-label" htmlFor="courier-vehicle">Meio de Transporte</label>
        <select className="l-lead-input l-lead-select" id="courier-vehicle" name="vehicle" defaultValue="" required>
          <option value="" disabled>Selecione seu veículo</option>
          {VEHICLE_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label className="l-lead-label" htmlFor="courier-pix-type">Tipo de Chave Pix (opcional)</label>
            <select className="l-lead-input l-lead-select" id="courier-pix-type" name="pixKeyType" defaultValue="">
              <option value="">Nenhum</option>
              {PIX_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="l-lead-label" htmlFor="courier-pix-key">Chave Pix (opcional)</label>
            <input className="l-lead-input" id="courier-pix-key" name="pixKey" placeholder="Chave Pix" />
          </div>
        </div>

        <label className="l-lead-label" htmlFor="courier-availability">Disponibilidade de Horário</label>
        <select className="l-lead-input l-lead-select" id="courier-availability" name="availability" defaultValue="">
          <option value="" disabled>Selecione</option>
          {AVAILABILITY_OPTIONS.map((o) => (
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
          {pending ? <><span className="btn-spinner" aria-hidden />Enviando…</> : <>CADASTRAR PERFIL <span aria-hidden="true">→</span></>}
        </button>
      </form>
    </div>
  )
}
