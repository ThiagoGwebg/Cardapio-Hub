// Declaração mínima local do 'web-push' (pacote não traz tipos e @types/web-push
// não está instalado). Cobre só o que usamos no /api/push/send.
declare module 'web-push' {
  export interface PushSubscription {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }
  interface WebPush {
    setVapidDetails(subject: string, publicKey: string, privateKey: string): void
    sendNotification(
      subscription: PushSubscription,
      payload?: string | Buffer,
      options?: Record<string, unknown>
    ): Promise<unknown>
    generateVAPIDKeys(): { publicKey: string; privateKey: string }
  }
  const webpush: WebPush
  export default webpush
}
