// Gancho de notificação de lead novo.
//
// Hoje só faz log no servidor — o lead sempre é salvo e aparece no /admin/leads
// mesmo sem notificação configurada. Quando quiser plugar o WhatsApp (Meta Cloud
// API, um "wa sender" próprio, e-mail, etc.), implemente o envio dentro do bloco
// marcado abaixo usando as env vars que preferir. Falha aqui NUNCA deve derrubar
// o cadastro do lead — por isso tudo roda dentro de try/catch e o retorno é ignorado.

export type LeadNotification = {
  name: string
  company?: string | null
  email: string
  whatsapp?: string | null
  monthlyRevenue?: string | null
  segment?: string | null
}

export async function notifyNewLead(lead: LeadNotification): Promise<void> {
  try {
    // ── Plugue aqui o envio de WhatsApp / e-mail ──────────────────────────
    // Exemplo (WhatsApp Cloud API), quando as credenciais existirem:
    //
    // const token = process.env.WHATSAPP_TOKEN
    // const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
    // const to = process.env.SALES_WHATSAPP_NUMBER
    // if (token && phoneId && to) {
    //   const texto = `🍔 Novo lead: ${lead.name}\nWhats: ${lead.whatsapp ?? '—'}\n` +
    //     `Segmento: ${lead.segment ?? '—'} · Faturamento: ${lead.monthlyRevenue ?? '—'}`
    //   await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    //     method: 'POST',
    //     headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: texto } }),
    //   })
    // }
    // ──────────────────────────────────────────────────────────────────────

    console.log('[lead] novo lead recebido:', lead.name, lead.whatsapp ?? lead.email)
  } catch (err) {
    // Nunca propaga: notificação é best-effort, o lead já está salvo.
    console.error('[lead] falha ao notificar (ignorado):', err)
  }
}
