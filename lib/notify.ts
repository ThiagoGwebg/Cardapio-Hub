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
