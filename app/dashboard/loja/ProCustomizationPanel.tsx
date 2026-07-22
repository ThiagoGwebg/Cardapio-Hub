'use client'

import { useState } from 'react'
import { STORE_FONTS, DEFAULT_STORE_FONT, googleFontHref } from '@/lib/plan'
import {
  type StoreTheme,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_MENU_LAYOUT,
  sanitizeMenuLayout,
} from '@/lib/storeTheme'
import ColorField from './ColorField'
import LayoutToggle from './LayoutToggle'

/**
 * Painel de Personalização Avançada (exclusivo Pro).
 * Renderizado dentro do <form action={updateStore}> da página da loja, então
 * os inputs são enviados junto com o resto das configurações no submit.
 *
 * Cuida de: tipografia, paleta de cores (primária/secundária/accent),
 * layout do cardápio e aviso promocional. Logo e banner ficam no card de
 * identidade básica (liberados em todos os planos).
 */
export default function ProCustomizationPanel({ theme }: { theme: StoreTheme }) {
  // Fonte controlada só para carregar a prévia da Google Font ao vivo.
  const [font, setFont] = useState(theme.font || DEFAULT_STORE_FONT)
  const previewFont = font && font !== DEFAULT_STORE_FONT ? font : ''

  return (
    <div className="pro-panel">
      {/* Carrega a fonte escolhida só para a prévia dentro do painel. */}
      {previewFont && <link rel="stylesheet" href={googleFontHref(previewFont)} />}

      <div className="pro-panel-head">
        <span className="settings-section-title" style={{ margin: 0 }}>
          Personalização avançada
        </span>
        <span className="pro-badge">Pro</span>
      </div>
      <p className="settings-hint">
        Deixe o cardápio com a identidade da sua marca: escolha a tipografia, a paleta de cores e
        como os produtos são exibidos.
      </p>

      {/* ── Tipografia ── */}
      <div className="pro-panel-block">
        <div className="pro-panel-block-title">Tipografia</div>
        <div className="form-group">
          <label className="form-label">Fonte do cardápio</label>
          <select
            className="form-input"
            name="font"
            value={font}
            onChange={(e) => setFont(e.target.value)}
          >
            {STORE_FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <p
            className="font-preview"
            style={{ fontFamily: previewFont ? `"${previewFont}", sans-serif` : undefined }}
          >
            {font} — Ag 123 · Seu cardápio com a fonte {font}
          </p>
        </div>
      </div>

      {/* ── Paleta de cores ── */}
      <div className="pro-panel-block">
        <div className="pro-panel-block-title">Paleta de cores</div>
        <div className="form-row">
          <ColorField
            name="primaryColor"
            label="Cor primária"
            hint="Botões, preços e ações principais."
            defaultValue={theme.primaryColor || DEFAULT_PRIMARY_COLOR}
          />
          <ColorField
            name="secondaryColor"
            label="Cor secundária"
            hint="Detalhes e realces sutis."
            defaultValue={theme.secondaryColor || DEFAULT_SECONDARY_COLOR}
          />
          <ColorField
            name="accentColor"
            label="Cor de destaque"
            hint="Selos e chamadas promocionais."
            defaultValue={theme.accentColor || DEFAULT_ACCENT_COLOR}
          />
        </div>
      </div>

      {/* ── Layout do cardápio ── */}
      <div className="pro-panel-block">
        <div className="pro-panel-block-title">Exibição dos produtos</div>
        <LayoutToggle
          name="menuLayout"
          defaultValue={sanitizeMenuLayout(theme.menuLayout) || DEFAULT_MENU_LAYOUT}
        />
      </div>

      {/* ── Aviso promocional ── */}
      <div className="pro-panel-block">
        <div className="pro-panel-block-title">Aviso promocional</div>
        <div className="form-group">
          <label className="form-label">Mensagem no topo do cardápio</label>
          <input
            className="form-input"
            name="announcement"
            maxLength={120}
            placeholder='Ex.: "Frete grátis acima de R$ 50 hoje!"'
            defaultValue={theme.announcement || ''}
          />
          <p className="color-field-hint">
            Aparece em destaque no topo do cardápio público. Deixe vazio para ocultar.
          </p>
        </div>
      </div>
    </div>
  )
}
