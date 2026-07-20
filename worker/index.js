// Injetado no service worker gerado pelo next-pwa (customWorkerSrc). O push agora é
// 100% OneSignal — o SW deles precisa rodar no MESMO arquivo/escopo que já cuida do
// cache offline, senão dois service workers disputam o mesmo escopo e o push para de
// funcionar. Precache/offline ficam por conta do SW gerado (Workbox), aqui só somamos
// o runtime de push/click do OneSignal via importScripts.
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js')
