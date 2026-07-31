import type { Metadata } from 'next'

/**
 * Ícones da marca para `metadata.icons`.
 *
 * ATENÇÃO: o Next NÃO faz merge do campo `icons` entre layouts — o valor do
 * layout mais aninhado substitui o do pai por completo. Um layout que declarava
 * só `icons: { apple: '...' }` ficava sem nenhum `<link rel="icon">`, e o
 * navegador caía no /favicon.ico implícito. Por isso todo layout que precisa de
 * um apple-touch próprio deve chamar esta função em vez de escrever o objeto à
 * mão — assim o favicon da marca nunca some da aba.
 *
 * Sem dependências de propósito: é importado pelo layout raiz e pelos painéis.
 *
 * @param appleIcon rota do apple-touch-icon da seção (ícone da PWA). Sem isso,
 *                  usa o ícone da marca.
 */
export function brandIcons(appleIcon?: string): Metadata['icons'] {
  return {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '16x16', type: 'image/x-icon' },
    ],
    shortcut: [{ url: '/favicon.ico' }],
    apple: [{ url: appleIcon || '/icon.svg', type: 'image/svg+xml' }],
  }
}
