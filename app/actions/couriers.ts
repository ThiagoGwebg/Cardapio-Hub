'use server'

import { createServerClient } from '@supabase/ssr'
import { notifyNewLead } from '@/lib/notify'

export type CourierFormState = { ok: boolean; error?: string }

export async function submitCourier(_prev: CourierFormState, formData: FormData): Promise<CourierFormState> {
  const name = String(formData.get('name') || '').trim()
  const email = String(formData.get('email') || '').trim()
  const whatsapp = String(formData.get('whatsapp') || '').trim()
  const city = String(formData.get('city') || '').trim()
  const vehicle = String(formData.get('vehicle') || '').trim()
  const pixKeyType = String(formData.get('pixKeyType') || '').trim()
  const pixKey = String(formData.get('pixKey') || '').trim()
  const availability = String(formData.get('availability') || '').trim()
  const consent = formData.get('consent')

  if (!name || !email || !whatsapp || !city || !vehicle) {
    return { ok: false, error: 'Por favor, preencha todos os campos obrigatórios.' }
  }
  if (!consent) {
    return { ok: false, error: 'Por favor, marque a caixa para continuar.' }
  }

  // Cliente anônimo simples
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const notesParts = [];
  if (pixKeyType && pixKey) notesParts.push(`Chave Pix: (${pixKeyType}) ${pixKey}`);
  if (availability) notesParts.push(`Disponibilidade: ${availability}`);
  const notes = notesParts.join('\n');

  const { error } = await supabase.from('leads').insert({
    name,
    company: city || null,
    email,
    whatsapp: whatsapp || null,
    monthly_revenue: vehicle || null,
    segment: 'Entregador',
    notes: notes || null,
  })

  if (error) {
    console.error('[courier signup error]', error)
    return { ok: false, error: 'Não foi possível enviar os dados agora. Tente de novo em instantes.' }
  }

  // Notifica o time reutilizando a função existente
  await notifyNewLead({
    name: `🛵 ${name}`,
    company: city,
    email,
    whatsapp,
    monthlyRevenue: vehicle,
    segment: 'Entregador',
  }).catch(() => {})

  return { ok: true }
}
