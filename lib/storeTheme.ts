import type { CSSProperties } from 'react'
import { DEFAULT_STORE_FONT } from '@/lib/plan'

/**
 * Fonte única de verdade do tema visual da loja.
 *
 * Todos os campos ficam na coluna JSONB `stores.theme` — por isso NENHUMA
 * migração de banco é necessária para adicionar novas opções de personalização.
 * Basta estender este tipo e o parse em `app/dashboard/loja/actions.ts`.
 *
 * Campos liberados em qualquer plano: logoUrl, bannerUrl.
 * Campos exclusivos do Pro: primaryColor, secondaryColor, accentColor, font,
 * menuLayout e announcement (o gate é aplicado no servidor, nas actions).
 */
export type StoreTheme = {
  logoUrl?: string
  bannerUrl?: string
  primaryColor?: string
  /** Cor secundária — usada em detalhes/realces sutis do cardápio público. */
  secondaryColor?: string
  /** Cor de destaque (accent) — usada em CTAs/badges. */
  accentColor?: string
  font?: string
  /** Layout dos produtos no cardápio público. */
  menuLayout?: MenuLayout
  announcement?: string
}

/** Layouts disponíveis para a listagem de produtos no cardápio público. */
export type MenuLayout = 'grid' | 'list'

export const MENU_LAYOUTS: {
  value: MenuLayout
  label: string
  hint: string
}[] = [
  { value: 'list', label: 'Lista', hint: 'Cartões largos, um por linha — foco na descrição.' },
  { value: 'grid', label: 'Grade', hint: 'Cartões compactos em colunas — foco na foto.' },
]

/**
 * Layout padrão. Propositalmente 'list': é a aparência que as lojas já têm hoje,
 * então lojas antigas (sem `menuLayout` salvo) continuam idênticas.
 */
export const DEFAULT_MENU_LAYOUT: MenuLayout = 'list'

/** Cores padrão da paleta avançada (fallback quando o Pro não definiu nada). */
export const DEFAULT_PRIMARY_COLOR = '#FF5722'
export const DEFAULT_SECONDARY_COLOR = '#0EA5E9'
export const DEFAULT_ACCENT_COLOR = '#F59E0B'

const HEX_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/

/** Valida uma cor hex (#rgb ou #rrggbb); devolve o fallback se inválida. */
export function sanitizeHexColor(value: string | undefined, fallback: string): string {
  const v = (value ?? '').trim()
  return HEX_RE.test(v) ? v : fallback
}

/** Converte "#rrggbb" (ou "#rgb") em "r, g, b" para uso em rgba(). */
export function hexToRgb(hex: string): string {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const int = parseInt(h, 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `${r}, ${g}, ${b}`
}

/** Normaliza um valor de layout desconhecido para um layout válido. */
export function sanitizeMenuLayout(value: string | undefined): MenuLayout {
  return value === 'grid' || value === 'list' ? value : DEFAULT_MENU_LAYOUT
}

/**
 * Monta as CSS custom properties aplicadas na raiz do cardápio público.
 * Expõe primária (+ versão RGB para rgba()), secundária e accent, além da
 * fonte escolhida. Só define a fonte quando difere do padrão do sistema.
 */
export function buildStorefrontVars(theme: StoreTheme | null | undefined): CSSProperties {
  const t = theme ?? {}
  const primary = sanitizeHexColor(t.primaryColor, DEFAULT_PRIMARY_COLOR)
  const secondary = sanitizeHexColor(t.secondaryColor, DEFAULT_SECONDARY_COLOR)
  const accent = sanitizeHexColor(t.accentColor, DEFAULT_ACCENT_COLOR)

  const vars: Record<string, string> = {
    '--primary': primary,
    '--primary-rgb': hexToRgb(primary),
    '--secondary': secondary,
    '--secondary-rgb': hexToRgb(secondary),
    '--accent': accent,
    '--accent-rgb': hexToRgb(accent),
  }

  const font = t.font && t.font !== DEFAULT_STORE_FONT ? t.font : ''
  if (font) vars['--store-font'] = `"${font}"`

  return vars as CSSProperties
}
