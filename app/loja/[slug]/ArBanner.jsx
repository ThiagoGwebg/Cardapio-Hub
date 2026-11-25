'use client'

import ModelViewer from '@/components/ModelViewer'
import { fmtCents } from '@/lib/format'

/*
 * Banner de destaque de um prato, no topo do cardápio.
 *
 * Dois modos, escolhidos pelo produto:
 *  - com modelo 3D (`ar_model_url`): o prato gira sozinho, o cliente gira com o
 *    dedo e o botão leva pro produto (que abre já no 3D, pronto pra câmera).
 *  - só com foto: a foto aparece numa moldura redonda e o botão abre o produto
 *    para pedir. Usado quando a loja não tem (ou desistiu do) modelo 3D.
 *
 * No modo 3D a órbita é travada entre 58° e 86° de elevação de propósito: o
 * prato fica sempre em pé, como na mesa, e ninguém cai embaixo do modelo — é
 * de lá que um prato modelado por fotos parece mais pobre.
 */
export default function ArBanner({ product, onOpen }) {
  if (!product) return null
  const em3d = !!product.ar_model_url
  const foto = product.images?.[0] || product.image_url
  if (!em3d && !foto) return null

  return (
    <section className={`ar-hero${em3d ? '' : ' ar-hero-foto'}`} aria-label={em3d ? `${product.name} em 3D` : `Destaque: ${product.name}`}>
      <div className="ar-hero-stage">
        <span className="ar-hero-glow" aria-hidden />
        {em3d ? (
          <ModelViewer
            src={product.ar_model_url}
            alt={`Modelo 3D de ${product.name}`}
            camera-controls="true"
            touch-action="pan-y"
            auto-rotate="true"
            auto-rotate-delay="400"
            rotation-per-second="20deg"
            camera-orbit="0deg 74deg 105%"
            min-camera-orbit="auto 58deg auto"
            max-camera-orbit="auto 86deg auto"
            disable-zoom="true"
            interaction-prompt="none"
            shadow-intensity="1"
            shadow-softness="0.85"
            environment-image="neutral"
            exposure="1.15"
            loading="eager"
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <span className="ar-hero-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto} alt={product.name} />
          </span>
        )}
      </div>

      <div className="ar-hero-copy">
        <span className="ar-hero-tag">
          {em3d && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 2.6 21 7.3v9.4L12 21.4 3 16.7V7.3l9-4.7Z M3 7.3l9 4.7 9-4.7 M12 12v9.4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {em3d ? 'Veja em 3D' : 'Destaque'}
        </span>

        <h2 className="ar-hero-title">{product.name}</h2>
        <p className="ar-hero-sub">
          {em3d
            ? 'Gire com o dedo e veja o tamanho real na sua mesa, pela câmera do celular.'
            : product.description || ''}
        </p>

        <div className="ar-hero-actions">
          <button type="button" className="ar-hero-btn" onClick={() => onOpen(product)}>
            {em3d ? 'Ver na sua mesa' : 'Pedir agora'}
          </button>
          <span className="ar-hero-price">{fmtCents(product.price_cents)}</span>
        </div>
      </div>
    </section>
  )
}
