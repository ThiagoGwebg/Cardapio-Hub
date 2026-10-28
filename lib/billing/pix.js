import QRCode from 'qrcode'
import { createAdminClient } from '@/lib/supabase/admin'

// Pix ESTÁTICO do banco da plataforma: um payload copia-e-cola por plano, guardado
// em platform_settings (nunca no código — o payload carrega CPF/nome do titular).
//
// O QR é renderizado localmente a partir do payload. De propósito NÃO usamos um
// serviço externo de QR (api.qrserver.com e similares): isso mandaria a chave Pix
// e o nome do titular para um terceiro a cada carregamento de página.


const SETTING_KEY = {
  free: 'pix_qr_lite',
  plus: 'pix_qr_plus',
  pro: 'pix_qr_pro',
}

const ALL_KEYS = Object.keys(SETTING_KEY);

/** Payload copia-e-cola configurado para o plano, ou null se ainda não cadastrado. */
export async function getPixPayloadForPlan(plan) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('platform_settings')
    .select('value')
    .eq('key', SETTING_KEY[plan])
    .maybeSingle()

  const payload = data?.value?.trim()
  return payload || null
}

export async function getAllPixPayloads() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('platform_settings')
    .select('key, value')
    .in('key', ALL_KEYS.map((k) => SETTING_KEY[k]))

  const byKey = new Map((data ?? []).map((r) => [r.key, r.value]))
  return {
    free: byKey.get(SETTING_KEY.free)?.trim() || null,
    plus: byKey.get(SETTING_KEY.plus)?.trim() || null,
    pro: byKey.get(SETTING_KEY.pro)?.trim() || null,
  }
}

export async function setPixPayloadForPlan(plan, payload) {
  const admin = createAdminClient()
  await admin
    .from('platform_settings')
    .upsert({ key: SETTING_KEY[plan], value: payload.trim() || null }, { onConflict: 'key' })
}

/** PNG do QR como data URI, gerado no servidor a partir do payload. */
export async function renderPixQrDataUrl(payload) {
  try {
    return await QRCode.toDataURL(payload, { margin: 1, width: 320, errorCorrectionLevel: 'M' })
  } catch {
    return null
  }
}

/**
 * Lê o valor embutido no payload Pix (campo EMV 54), em centavos.
 * Serve para avisar quando o QR cadastrado não bate com o preço cobrado —
 * o lojista pagaria o valor errado e a conciliação viraria um problema.
 */
export function readPixAmountCents(payload) {
  // Campos EMV: ID(2) + tamanho(2) + valor. Percorre até achar o 54.
  let i = 0
  while (i + 4 <= payload.length) {
    const id = payload.slice(i, i + 2)
    const len = Number(payload.slice(i + 2, i + 4))
    if (!Number.isFinite(len)) return null
    const value = payload.slice(i + 4, i + 4 + len)
    if (id === '54') {
      const amount = Number(value)
      return Number.isFinite(amount) ? Math.round(amount * 100) : null
    }
    i += 4 + len
  }
  return null
}
