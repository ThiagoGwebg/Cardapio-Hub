'use client'

import ModelViewer from '@/components/ModelViewer'
import { fmtCents } from '@/lib/format'

/*
 * Banner de destaque do prato em 3D, no topo do cardápio.
 *
 * O visor dentro do produto continua sendo o lugar do "Ver na sua mesa" —
 * aqui o modelo serve de vitrine: gira sozinho, o cliente pode girar com o
 * dedo e o botão leva pro produto (que abre já no 3D, pronto pra câmera).
 *
 * A órbita é travada entre 58° e 86° de elevação de propósito: o prato fica
 * sempre em pé, como na mesa, e ninguém cai embaixo do modelo — é de lá que
 * um prato modelado por fotos parece mais pobre.
 */
export default function ArBanner({ product, onOpen }) {
  if (!product?.ar_model_url) return null

  return (
    <section className="ar-hero" aria-label={`${product.name} em 3D`}>
      <div className="ar-hero-stage">
        <span className="ar-hero-glow" aria-hidden />
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
      </div>

      <div className="ar-hero-copy">
        <span className="ar-hero-tag">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 2.6 21 7.3v9.4L12 21.4 3 16.7V7.3l9-4.7Z M3 7.3l9 4.7 9-4.7 M12 12v9.4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
          Veja em 3D
        </span>

        <h2 className="ar-hero-title">{product.name}</h2>
        <p className="ar-hero-sub">
          Gire com o dedo e veja o tamanho real na sua mesa, pela câmera do celular.
        </p>

        <div className="ar-hero-actions">
          <button type="button" className="ar-hero-btn" onClick={() => onOpen(product)}>
            Ver na sua mesa
          </button>
          <span className="ar-hero-price">{fmtCents(product.price_cents)}</span>
        </div>
      </div>
    </section>
  )
}
