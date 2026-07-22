import crypto from 'crypto'
import { getBaseUrl } from '@/lib/baseUrl'

// Integração Mercado Pago (marketplace): a plataforma é a "aplicação" e cada lojista
// conecta a própria conta via OAuth. As cobranças são criadas COM O TOKEN DO LOJISTA,
// então o dinheiro cai direto na conta dele — a plataforma nunca retém o valor.

export const MP_API = 'https://api.mercadopago.com'

export function getMpAppCreds() {
  const clientId = process.env.MP_CLIENT_ID
  const clientSecret = process.env.MP_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('MP_CLIENT_ID / MP_CLIENT_SECRET não configurados')
  }
  return { clientId, clientSecret }
}

// redirect_uri precisa ser IDÊNTICA na URL de autorização, na troca do code e no painel do MP.
export function getMpRedirectUri() {
  const explicit = process.env.MP_REDIRECT_URI?.trim()
  if (explicit) return explicit
  return `${getBaseUrl()}/api/mp/oauth/callback`
}

type MpFetchOpts = {
  accessToken: string
  method?: 'GET' | 'POST' | 'PUT'
  body?: unknown
  idempotencyKey?: string
}

// Wrapper das chamadas REST autenticadas. Lança erro com o corpo do MP em falhas.
export async function mpFetch<T = unknown>(path: string, opts: MpFetchOpts): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${opts.accessToken}`,
    Accept: 'application/json',
  }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (opts.idempotencyKey) headers['X-Idempotency-Key'] = opts.idempotencyKey

  const res = await fetch(`${MP_API}${path}`, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  })

  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  if (!res.ok) {
    const detail = json?.message || json?.error || res.statusText
    throw new Error(`Mercado Pago ${res.status}: ${detail}`)
  }
  return json as T
}

export type MpTokenResponse = {
  access_token: string
  refresh_token: string
  user_id: number
  public_key: string
  expires_in: number
  token_type: string
  scope: string
}

// Troca o `code` do OAuth pelo access/refresh token do lojista.
export async function exchangeOAuthCode(code: string): Promise<MpTokenResponse> {
  const { clientId, clientSecret } = getMpAppCreds()
  return postOAuthToken({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: getMpRedirectUri(),
  })
}

// Renova o access token do lojista usando o refresh token.
export async function refreshOAuthToken(refreshToken: string): Promise<MpTokenResponse> {
  const { clientId, clientSecret } = getMpAppCreds()
  return postOAuthToken({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  })
}

async function postOAuthToken(payload: Record<string, string>): Promise<MpTokenResponse> {
  const res = await fetch(`${MP_API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  if (!res.ok) {
    const detail = json?.message || json?.error || res.statusText
    throw new Error(`Mercado Pago OAuth ${res.status}: ${detail}`)
  }
  return json as MpTokenResponse
}

// URL de autorização que o lojista abre pra conectar a conta dele.
export function buildAuthorizationUrl(state: string): string {
  const { clientId } = getMpAppCreds()
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    platform_id: 'mp',
    state,
    redirect_uri: getMpRedirectUri(),
  })
  return `https://auth.mercadopago.com.br/authorization?${params.toString()}`
}

// --- state assinado (anti-CSRF no fluxo OAuth) ---
function stateSecret() {
  return process.env.MP_OAUTH_STATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

export function signState(storeId: string): string {
  const payload = `${storeId}.${Date.now()}`
  const sig = crypto.createHmac('sha256', stateSecret()).update(payload).digest('hex')
  return `${Buffer.from(payload).toString('base64url')}.${sig}`
}

export function verifyState(state: string): { storeId: string } | null {
  const [encoded, sig] = state.split('.')
  if (!encoded || !sig) return null
  let payload: string
  try {
    payload = Buffer.from(encoded, 'base64url').toString('utf8')
  } catch {
    return null
  }
  const expected = crypto.createHmac('sha256', stateSecret()).update(payload).digest('hex')
  if (!timingSafeEqual(sig, expected)) return null
  const [storeId, ts] = payload.split('.')
  // expira em 30 min
  if (!ts || Date.now() - Number(ts) > 30 * 60 * 1000) return null
  return { storeId }
}

// Verifica a assinatura do webhook do MP (header x-signature).
// Manifesto: id:{data.id};request-id:{x-request-id};ts:{ts};  — HMAC-SHA256 com MP_WEBHOOK_SECRET.
export function verifyWebhookSignature(params: {
  xSignature: string | null
  xRequestId: string | null
  dataId: string | null
}): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret || !params.xSignature) return false

  const parts = Object.fromEntries(
    params.xSignature.split(',').map((kv) => {
      const [k, v] = kv.split('=')
      return [k?.trim(), v?.trim()]
    })
  ) as { ts?: string; v1?: string }

  if (!parts.ts || !parts.v1) return false

  // Anti-replay: rejeita assinaturas claramente velhas. Tolerante à unidade do ts (s ou ms)
  // e com janela larga (10 min) pra nunca barrar um webhook legítimo recente do MP.
  const tsRaw = Number(parts.ts)
  if (Number.isFinite(tsRaw)) {
    const tsMs = tsRaw > 1e12 ? tsRaw : tsRaw * 1000
    if (Math.abs(Date.now() - tsMs) > 10 * 60 * 1000) return false
  }

  const manifest =
    `id:${params.dataId ?? ''};` +
    (params.xRequestId ? `request-id:${params.xRequestId};` : '') +
    `ts:${parts.ts};`
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  return timingSafeEqual(parts.v1, expected)
}

function timingSafeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}
