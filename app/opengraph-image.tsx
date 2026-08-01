import { ImageResponse } from 'next/og'
import { absoluteUrl, ENTRY_PRICE_BRL } from '@/lib/seo'

// Imagem de compartilhamento (WhatsApp, Instagram, Facebook, LinkedIn).
// Gerada em build/edge pelo Satori — nada de arquivo estático pra manter atualizado.
// Vale mais que parece: no WhatsApp, um card com imagem grande tem CTR muito maior
// que um link cru, e é por WhatsApp que a maioria dos lojistas vai receber o link.
export const alt = 'Cardápio Hub — cardápio digital e sistema de pedidos sem comissão'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '72px 80px',
          background: 'linear-gradient(135deg, #121212 0%, #1c1410 55%, #2b1408 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignSelf: 'flex-start',
            padding: '10px 20px',
            borderRadius: 999,
            background: '#FF5722',
            color: '#ffffff',
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: -0.4,
          }}
        >
          sem taxa por pedido
        </div>

        <div
          style={{
            marginTop: 34,
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.06,
            letterSpacing: -2.5,
            maxWidth: 940,
          }}
        >
          Do balcão pro celular do seu cliente.
        </div>

        {/* Texto num único nó: o Satori exige `display` explícito em qualquer
            elemento com mais de um filho, e interpolação criaria vários nós. */}
        <div style={{ marginTop: 26, fontSize: 33, color: '#c9c4c0', maxWidth: 900, lineHeight: 1.35 }}>
          {`Cardápio digital com QR Code, pedidos em tempo real e caixa num painel só. A partir de R$ ${ENTRY_PRICE_BRL}/mês, sem comissão por venda.`}
        </div>

        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 34,
            fontWeight: 800,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 16,
              background: '#FF5722',
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            C
          </div>
          {/* Host real (sem "www."), tirado da URL base — nunca uma string fixa,
              pra o card não anunciar um domínio diferente do que está no ar. */}
          <span>{new URL(absoluteUrl('/')).host.replace(/^www\./, '')}</span>
        </div>
      </div>
    ),
    size
  )
}
