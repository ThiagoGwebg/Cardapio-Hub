import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// Gera o service worker (precache de assets essenciais + fallback offline) via Workbox.
// Desligado em dev pra não brigar com o Turbopack — teste com `npm run build && npm start`.
// O push de pedido novo mora em worker/index.js e é injetado no SW gerado (customWorkerSrc).
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: false,
  customWorkerSrc: "worker",
  fallbacks: {
    document: "/~offline",
  },
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
  },
});

const nextConfig: NextConfig = {
  // Config Turbopack explícita (mesmo vazia) para o Next 16 não tratar o
  // `webpack` injetado pelo next-pwa como erro fatal ao rodar `next dev`.
  // Em dev o PWA está desligado, então não há nada de Workbox a migrar.
  turbopack: {},
};

export default withPWA(nextConfig);
