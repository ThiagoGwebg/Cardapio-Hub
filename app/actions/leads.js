'use server'

import { createServerClient } from '@supabase/ssr'
import { notifyNewLead } from '@/lib/notify'
import { checarEnvio } from '@/lib/antispam'


export async function submitLead(_prev, formData) {
  const name = String(formData.get('name') || '').trim()
  const company = String(formData.get('company') || '').trim()
  const email = String(formData.get('email') || '').trim()
  const whatsapp = String(formData.get('whatsapp') || '').trim()
  const monthlyRevenue = String(formData.get('monthlyRevenue') || '').trim()
  const segment = String(formData.get('segment') || '').trim()
  const consent = formData.get('consent')

  if (!name || !email) {
    return { ok: false, error: 'Preencha pelo menos nome e e-mail.' }
  }
  if (!consent) {
    return { ok: false, error: 'Por favor, marque a caixa para continuar.' }
  }

  // Antispam antes de encostar no banco ou disparar e-mail: a isca e o tempo de
  // preenchimento barram o robô, o resto pega lixo que passou. Ver lib/antispam.js.
  const bloqueio = await checarEnvio(formData, {
    name, company, email, whatsapp, monthlyRevenue, segment,
  })
  if (bloqueio) {
    console.warn(`[antispam] lead barrado — ${bloqueio.motivo}`)
    return bloqueio.resposta
  }

  // Cliente anônimo simples — RPC/insert público, sem sessão de usuário
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const { error } = await supabase.from('leads').insert({
    name,
    company: company || null,
    email,
    whatsapp: whatsapp || null,
    monthly_revenue: monthlyRevenue || null,
    segment: segment || null,
  })

  if (error) {
    return { ok: false, error: 'Não deu pra enviar agora, tenta de novo em instantes.' }
  }

  // Notifica o time (best-effort — não bloqueia nem derruba o cadastro do lead)
  await notifyNewLead({
    name,
    company,
    email,
    whatsapp,
    monthlyRevenue,
    segment,
  })

  return { ok: true }
}
