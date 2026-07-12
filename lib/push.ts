// Registra o service worker e inscreve o aparelho pra receber push de pedido novo.
// Degrada com segurança: sem suporte ou sem chave VAPID, retorna um status e não quebra.

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export type PushResult = 'ok' | 'unsupported' | 'no-key' | 'error'

export async function subscribeToPush(): Promise<PushResult> {
  try {
    if (typeof window === 'undefined') return 'unsupported'
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'

    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!key) return 'no-key'

    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      })
    }

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    })
    return res.ok ? 'ok' : 'error'
  } catch {
    return 'error'
  }
}
