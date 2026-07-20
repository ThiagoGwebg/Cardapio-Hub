'use client'

// Wrapper fino sobre o react-onesignal — centraliza a inicialização (uma vez por
// seção do site, com o mesmo service worker que já cuida do cache offline) e a
// ativação de alertas (permissão + tag), pra Loja e Admin não duplicarem a lógica.

let initPromise: Promise<void> | null = null

export type OneSignalScope = 'loja' | 'dashboard' | 'pedido'

const SCOPE_PATH: Record<OneSignalScope, string> = {
  dashboard: '/dashboard',
  loja: '/loja/',
  // O rastreador de pedido (cliente) mora fora de /loja/[slug] — precisa do próprio
  // escopo pra ter um service worker ativo ali e receber push nessa página.
  pedido: '/pedido/',
}

/**
 * Inicializa o SDK do OneSignal usando o MESMO /sw.js já registrado pelo InstallPwaButton
 * (o worker/index.js importa o OneSignalSDK.sw.js) — evita dois service workers
 * disputando o mesmo escopo. Idempotente: seguro chamar em todo mount do componente.
 */
export function initOneSignal(scope: OneSignalScope): Promise<void> {
  if (initPromise) return initPromise

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
  if (!appId || typeof window === 'undefined') {
    return Promise.resolve()
  }

  const scopePath = SCOPE_PATH[scope]

  initPromise = import('react-onesignal').then(({ default: OneSignal }) =>
    OneSignal.init({
      appId,
      serviceWorkerPath: '/sw.js',
      serviceWorkerParam: { scope: scopePath },
      allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
    })
  )
  return initPromise
}

export type ActivateResult = 'ok' | 'denied' | 'unsupported' | 'no-app-id'

/**
 * Pede permissão de notificação (prompt nativo do navegador, via OneSignal) e marca
 * o usuário com as tags informadas — é assim que o /api/push/send sabe pra quem mandar.
 */
export async function activatePush(scope: OneSignalScope, tags: Record<string, string>): Promise<ActivateResult> {
  if (!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) return 'no-app-id'
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'

  await initOneSignal(scope)
  const { default: OneSignal } = await import('react-onesignal')

  await OneSignal.Notifications.requestPermission()
  if (Notification.permission !== 'granted') return 'denied'

  OneSignal.User.addTags(tags)
  return 'ok'
}
