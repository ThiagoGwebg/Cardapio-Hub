// Notificação de lead novo — e-mail via Resend (best-effort).
//
// O lead SEMPRE é salvo e aparece no /admin/leads, com ou sem notificação.
// O envio de e-mail só acontece se as env vars existirem; sem elas, cai no log.
// Falha aqui NUNCA derruba o cadastro do lead (tudo em try/catch, retorno ignorado).
//
// Para ligar (na Vercel → Settings → Environment Variables):
//   RESEND_API_KEY   = re_xxx           (chave da conta Resend — resend.com)
//   SALES_EMAIL      = voce@dominio.com (pra onde chega o aviso; fallback: ADMIN_EMAILS)
//   LEAD_EMAIL_FROM  = "Cardápio Hub <onboarding@resend.dev>"  (opcional)
//
// WhatsApp fica pronto pra plugar depois no bloco marcado no final.

import { getBaseUrl } from '@/lib/baseUrl'

export type LeadNotification = {
  name: string
  company?: string | null
  email: string
  whatsapp?: string | null
  monthlyRevenue?: string | null
  segment?: string | null
}

function esc(s: string | null | undefined): string {
  return String(s ?? '—').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))
}

export async function notifyNewLead(lead: LeadNotification): Promise<void> {
  try {
    await sendLeadEmail(lead)

    // ── WhatsApp (opcional, plugar quando tiver credenciais da Meta) ──────────
    // const token = process.env.WHATSAPP_TOKEN
    // const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
    // const to = process.env.SALES_WHATSAPP_NUMBER
    // if (token && phoneId && to) {
    //   const texto = `🍔 Novo lead: ${lead.name}\nWhats: ${lead.whatsapp ?? '—'}`
    //   await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    //     method: 'POST',
    //     headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: texto } }),
    //   })
    // }
    // ─────────────────────────────────────────────────────────────────────────
  } catch (err) {
    // Nunca propaga: notificação é best-effort, o lead já está salvo.
    console.error('[lead] falha ao notificar (ignorado):', err)
  }
}

// ─── Cobrança da mensalidade ────────────────────────────────────────────────
// Avisos que o LOJISTA recebe sobre a própria fatura. Mesmo contrato do lead:
// best-effort, nunca derruba o ciclo de cobrança se o e-mail falhar.

export type InvoiceNotification = {
  to: string
  storeName: string
  amountLabel: string
  dueLabel: string
  kind: 'open' | 'overdue' | 'final'
  /** Dias restantes até a suspensão — só no aviso final. */
  daysLeft?: number
}

const INVOICE_COPY: Record<
  InvoiceNotification['kind'],
  (n: InvoiceNotification) => { subject: string; title: string; body: string; color: string }
> = {
  open: (n) => ({
    subject: `Sua mensalidade do Cardápio Hub vence em ${n.dueLabel}`,
    title: 'Mensalidade disponível para pagamento',
    body: `A mensalidade de <b>${n.storeName}</b> (${n.amountLabel}) vence em <b>${n.dueLabel}</b>. Você pode pagar pelo Pix direto no painel — a liberação é automática.`,
    color: '#FF5722',
  }),
  overdue: (n) => ({
    subject: `Mensalidade em atraso — ${n.storeName}`,
    title: 'Mensalidade em atraso',
    body: `A mensalidade de <b>${n.storeName}</b> (${n.amountLabel}) venceu em <b>${n.dueLabel}</b>. Pague pelo Pix no painel para manter seu cardápio no ar.`,
    color: '#F59E0B',
  }),
  final: (n) => ({
    subject: `Seu cardápio sai do ar em ${n.daysLeft ?? 2} dia(s)`,
    title: 'Seu cardápio está prestes a sair do ar',
    body: `A mensalidade de <b>${n.storeName}</b> (${n.amountLabel}) venceu em <b>${n.dueLabel}</b>. Se não for paga em <b>${n.daysLeft ?? 2} dia(s)</b>, o cardápio fica indisponível para seus clientes até a regularização.`,
    color: '#DC2626',
  }),
}

export async function notifyInvoice(n: InvoiceNotification): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.LEAD_EMAIL_FROM || 'Cardápio Hub <onboarding@resend.dev>'
    if (!apiKey || !n.to) {
      console.log('[billing] aviso de fatura (e-mail não configurado):', n.kind, n.storeName)
      return
    }

    const copy = INVOICE_COPY[n.kind](n)
    const link = `${getBaseUrl()}/dashboard/billing`

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
        <h2 style="color:${copy.color};margin:0 0 12px">${copy.title}</h2>
        <p style="font-size:14px;line-height:1.6;color:#333">${copy.body}</p>
        <div style="margin-top:18px">
          <a href="${link}" style="background:${copy.color};color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold;display:inline-block">Pagar com Pix</a>
        </div>
        <p style="font-size:12px;color:#888;margin-top:18px">
          A baixa é automática assim que o Pix cair — não precisa enviar comprovante.
        </p>
      </div>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: n.to, subject: copy.subject, html }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[billing] Resend retornou erro:', res.status, detail)
    }
  } catch (err) {
    console.error('[billing] falha ao notificar fatura (ignorado):', err)
  }
}

/** Avisa a plataforma que um lojista declarou pagamento — hora de conferir o extrato. */
export async function notifyPaymentClaimed(p: { storeName: string; amountCents: number }): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    const to = process.env.SALES_EMAIL || (process.env.ADMIN_EMAILS || '').split(',')[0]?.trim()
    const from = process.env.LEAD_EMAIL_FROM || 'Cardápio Hub <onboarding@resend.dev>'
    const valor = (p.amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

    if (!apiKey || !to) {
      console.log('[billing] pagamento declarado (e-mail não configurado):', p.storeName, valor)
      return
    }

    const link = `${getBaseUrl()}/admin/faturas`
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#FF5722;margin:0 0 12px">Pagamento declarado</h2>
        <p style="font-size:14px;line-height:1.6;color:#333">
          <b>${esc(p.storeName)}</b> informou que pagou a mensalidade de <b>${valor}</b>.
          Confira no extrato e dê baixa no painel.
        </p>
        <a href="${link}" style="background:#FF5722;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold;display:inline-block">Conferir faturas</a>
      </div>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject: `Pagamento declarado: ${p.storeName} (${valor})`, html }),
    })
    if (!res.ok) console.error('[billing] Resend retornou erro:', res.status)
  } catch (err) {
    console.error('[billing] falha ao avisar pagamento declarado (ignorado):', err)
  }
}

async function sendLeadEmail(lead: LeadNotification): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.SALES_EMAIL || (process.env.ADMIN_EMAILS || '').split(',')[0]?.trim()
  const from = process.env.LEAD_EMAIL_FROM || 'Cardápio Hub <onboarding@resend.dev>'

  if (!apiKey || !to) {
    // Sem credenciais configuradas ainda — registra e segue.
    console.log('[lead] novo lead (e-mail não configurado):', lead.name, lead.whatsapp ?? lead.email)
    return
  }

  const painel = `${getBaseUrl()}/admin/leads`
  const waDigits = (lead.whatsapp || '').replace(/\D/g, '')
  const waLink = waDigits
    ? `https://wa.me/${waDigits.length <= 11 ? '55' + waDigits : waDigits}?text=${encodeURIComponent(
        `Oi ${lead.name}! Vi seu interesse no Cardápio Hub 🍔`
      )}`
    : ''

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
      <h2 style="color:#FF5722;margin:0 0 12px">🍔 Novo lead no Cardápio Hub</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#777">Nome</td><td style="padding:6px 0"><b>${esc(lead.name)}</b></td></tr>
        <tr><td style="padding:6px 0;color:#777">WhatsApp</td><td style="padding:6px 0"><b>${esc(lead.whatsapp)}</b></td></tr>
        <tr><td style="padding:6px 0;color:#777">E-mail</td><td style="padding:6px 0">${esc(lead.email)}</td></tr>
        <tr><td style="padding:6px 0;color:#777">Empresa</td><td style="padding:6px 0">${esc(lead.company)}</td></tr>
        <tr><td style="padding:6px 0;color:#777">Segmento</td><td style="padding:6px 0">${esc(lead.segment)}</td></tr>
        <tr><td style="padding:6px 0;color:#777">Faturamento</td><td style="padding:6px 0">${esc(lead.monthlyRevenue)}</td></tr>
      </table>
      <div style="margin-top:18px">
        ${waLink ? `<a href="${waLink}" style="background:#25D366;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold;display:inline-block;margin-right:8px">Chamar no WhatsApp</a>` : ''}
        <a href="${painel}" style="background:#FF5722;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold;display:inline-block">Abrir painel</a>
      </div>
    </div>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: `🍔 Novo lead: ${lead.name}${lead.company ? ` (${lead.company})` : ''}`,
      html,
      reply_to: lead.email,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error('[lead] Resend retornou erro:', res.status, detail)
  }
}
