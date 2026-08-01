/**
 * Telefone brasileiro: normalização, validação e montagem de link do WhatsApp.
 *
 * Existe porque `wa.me` estava sendo montado à mão em cinco lugares, cada um com
 * uma regra ligeiramente diferente de código do país — a página "Meus Links"
 * esquecia o 55 e gerava link quebrado até para número válido.
 *
 * REGRA: nada que vá virar link ou ser exibido como telefone deve usar
 * `.replace(/\D/g,'')` solto. Passe por aqui.
 */

/** Só os dígitos, sem máscara. */
export function phoneDigits(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\D/g, '')
}

/**
 * Número nacional (DDD + 8 ou 9 dígitos), sem o código do país.
 * Aceita entrada já prefixada com 55 e a desmonta. Devolve null se não for
 * um telefone brasileiro plausível — é o que impede uma senha digitada no
 * campo errado de virar `wa.me/03`.
 */
export function brNationalNumber(raw: string | null | undefined): string | null {
  const d = phoneDigits(raw)
  if (d.length === 10 || d.length === 11) return d
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return d.slice(2)
  return null
}

/** true quando o valor é um telefone brasileiro utilizável. */
export function isValidBrPhone(raw: string | null | undefined): boolean {
  return brNationalNumber(raw) !== null
}

/** Formato E.164 (+5519999998888) — para schema.org e tel:. */
export function e164(raw: string | null | undefined): string | undefined {
  const n = brNationalNumber(raw)
  return n ? `+55${n}` : undefined
}

/**
 * Link do WhatsApp, já com código do país. Devolve string vazia quando o
 * número não é válido, para que a UI possa simplesmente não renderizar o
 * link em vez de oferecer um destino quebrado.
 */
export function waLink(raw: string | null | undefined, text?: string): string {
  const n = brNationalNumber(raw)
  if (!n) return ''
  const q = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/55${n}${q}`
}

/** Exibição amigável: (19) 99999-8888. Cai no valor cru se não der pra formatar. */
export function fmtPhone(raw: string | null | undefined): string {
  const n = brNationalNumber(raw)
  if (!n) return raw ?? ''
  const ddd = n.slice(0, 2)
  const rest = n.slice(2)
  return rest.length === 9
    ? `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`
    : `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`
}
