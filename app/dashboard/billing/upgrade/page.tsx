import { ArrowLeft, Check, Clock } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentStore } from '@/lib/store'
import { getStoreUsage } from '@/lib/plan'
import { DEFAULT_PLAN_PRICE_CENTS, planLabel } from '@/lib/billing/plans'
import { fmtCents } from '@/lib/format'
import { UsageMeter } from '@/components/dashboard/ProUpsell'
import SubmitButton from '@/components/ui/SubmitButton'
import { fmtPhone } from '@/lib/phone'
import { requestProUpgrade } from '../actions'

export const metadata = {
  title: 'Fazer upgrade pro Pro — Cardápio Hub',
  robots: { index: false, follow: false },
}

// O que o lojista mais sente falta no Lite. A tabela completa Lite × Pro continua
// em /dashboard/billing — aqui é só o suficiente pra ele confirmar a decisão.
const HIGHLIGHTS = [
  'Produtos e pedidos ilimitados',
  'Clientes fiéis (CRM + WhatsApp)',
  'Relatórios, top produtos e horários de pico',
  'Cardápio sem o selo "Feito com Cardápio Hub"',
  'Cor, fonte e aviso promocional personalizados',
  'QR Code para imprimir e suporte prioritário',
]

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string; error?: string }>
}) {
  const { enviado, error } = await searchParams
  const { supabase, store } = await getCurrentStore()

  const usage = await getStoreUsage(supabase, store.id)
  // Quem já é Pro não tem o que pedir: volta pra tela da assinatura.
  if (usage.isPro) redirect('/dashboard/billing')

  const { data: pending } = await supabase
    .from('plan_upgrade_requests')
    .select('created_at, contact_phone')
    .eq('store_id', store.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ created_at: string; contact_phone: string | null }>()

  return (
    <>
      <div className="dash-header">
        <div className="dash-title">Fazer upgrade pro Pro</div>
      </div>

      <Link
        href="/dashboard/billing"
        style={{
          fontSize: 12,
          color: 'var(--muted)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          marginBottom: 14,
        }}
      >
        <ArrowLeft size={13} strokeWidth={2.4} /> Voltar para Assinatura
      </Link>

      {error && (
        <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>
          Não foi possível registrar seu pedido. Tente de novo em instantes.
        </p>
      )}

      {pending ? (
        <div className="settings-card" style={{ borderLeft: '4px solid var(--green)' }}>
          <div className="settings-section-title" style={{ color: 'var(--green)' }}>
            {enviado ? 'Pedido enviado!' : 'Pedido em andamento'}
          </div>
          <p style={{ fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 12 }}>
            <Clock size={15} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              Recebemos seu pedido de upgrade em{' '}
              {new Date(pending.created_at).toLocaleDateString('pt-BR')}. Nosso time entra em contato
              {pending.contact_phone ? ` no WhatsApp ${fmtPhone(pending.contact_phone)}` : ''} em até 1 dia útil
              pra ativar o Pro e combinar a nova mensalidade.
            </span>
          </p>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 0 }}>
            Até lá seu cardápio continua funcionando normalmente no plano {planLabel(usage.plan)} — nada muda e nada é cobrado agora.
          </p>
        </div>
      ) : (
        <>
          <div className="settings-card">
            <div className="settings-section-title">Sua loja</div>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{store.name}</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
              Hoje no {planLabel(usage.plan)} · {fmtCents(DEFAULT_PLAN_PRICE_CENTS[usage.plan])}/mês → Pro · {fmtCents(DEFAULT_PLAN_PRICE_CENTS.pro)}/mês
            </p>

            <UsageMeter label="Produtos cadastrados" used={usage.productCount} limit={usage.maxProducts} />
            <UsageMeter label="Pedidos neste mês" used={usage.ordersThisMonth} limit={usage.maxOrdersPerMonth} />

            <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0', display: 'grid', gap: 8 }}>
              {HIGHLIGHTS.map((h) => (
                <li key={h} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={15} strokeWidth={2.6} style={{ color: 'var(--green)', flexShrink: 0 }} />
                  {h}
                </li>
              ))}
            </ul>
          </div>

          <form action={requestProUpgrade} className="settings-card">
            <div className="settings-section-title">Confirmar pedido</div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
              A gente ativa o Pro pra você e ajusta a mensalidade na próxima fatura. Sem cartão e sem fidelidade —
              nada é cobrado agora.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="upgrade-phone">
                WhatsApp para contato
              </label>
              <input
                className="form-input"
                id="upgrade-phone"
                name="phone"
                type="tel"
                defaultValue={fmtPhone(store.whatsapp_number)}
                placeholder="(19) 99999-8888"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="upgrade-note">
                Quer contar algo pra gente? (opcional)
              </label>
              <textarea
                className="form-input"
                id="upgrade-note"
                name="note"
                rows={3}
                maxLength={500}
                placeholder="Ex.: preciso liberar mais produtos antes do fim de semana"
              />
            </div>

            <SubmitButton className="save-btn" pendingLabel="Enviando…">
              Confirmar pedido de upgrade
            </SubmitButton>
          </form>
        </>
      )}
    </>
  )
}
