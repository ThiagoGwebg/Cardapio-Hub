'use client'

import { useState } from 'react'
import Link from 'next/link'

type Props = {
  hasProducts: boolean
  hasOrders: boolean
  hasLogo: boolean
  hasAddress: boolean
  storeName: string
  isPro: boolean
}

type Step = {
  key: string
  label: string
  done: boolean
  href: string
  desc: string
}

export default function OnboardingChecklist({ hasProducts, hasOrders, hasLogo, hasAddress, storeName, isPro }: Props) {
  const [dismissed, setDismissed] = useState(false)

  const steps: Step[] = [
    {
      key: 'products',
      label: 'Adicionar produtos',
      done: hasProducts,
      href: '/dashboard/cardapio',
      desc: 'Cadastre os itens do seu cardápio para os clientes verem.',
    },
    {
      key: 'store',
      label: 'Configurar sua loja',
      done: hasLogo && hasAddress,
      href: '/dashboard/loja',
      desc: 'Adicione logo, endereço e horários de funcionamento.',
    },
    {
      key: 'share',
      label: 'Compartilhar seu link',
      done: hasProducts && (hasLogo || hasAddress),
      href: '/dashboard/links',
      desc: 'Copie o link do seu cardápio e divulgue no WhatsApp, Instagram e mais.',
    },
    {
      key: 'first-order',
      label: 'Receber o 1º pedido',
      done: hasOrders,
      href: '/dashboard/pedidos',
      desc: 'Quando um cliente fizer um pedido, ele aparece aqui em tempo real.',
    },
  ]

  const completedCount = steps.filter((s) => s.done).length
  const allDone = completedCount === steps.length

  if (dismissed && allDone) return null

  return (
    <div className="onboarding-card">
      <div className="onboarding-header">
        <div>
          <div className="onboarding-title">
            {allDone ? '🎉 Tudo pronto!' : `Bem-vindo(a), ${storeName}!`}
          </div>
          <div className="onboarding-sub">
            {allDone
              ? 'Sua loja está configurada. Continue acompanhando seus pedidos.'
              : `${completedCount} de ${steps.length} etapas concluídas`}
          </div>
        </div>
        {(dismissed || allDone) && (
          <button className="onboarding-dismiss" onClick={() => setDismissed(true)} aria-label="Fechar">
            ✕
          </button>
        )}
      </div>

      {!allDone && (
        <>
          <div className="onboarding-progress">
            <div
              className="onboarding-bar"
              style={{ width: `${(completedCount / steps.length) * 100}%` }}
            />
          </div>

          <div className="onboarding-steps">
            {steps.map((step) => (
              <Link
                key={step.key}
                href={step.href}
                className={`onboarding-step ${step.done ? 'done' : ''}`}
              >
                <span className={`onboarding-step-check ${step.done ? 'checked' : ''}`}>
                  {step.done ? '✓' : `${steps.indexOf(step) + 1}`}
                </span>
                <div className="onboarding-step-info">
                  <div className="onboarding-step-label">{step.label}</div>
                  <div className="onboarding-step-desc">{step.desc}</div>
                </div>
                <span className="onboarding-step-arrow">→</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
