/**
 * Nomes dos campos ocultos do antispam, isolados num arquivo sem dependência
 * de servidor.
 *
 * Existe separado de `lib/antispam.js` de propósito: os formulários são client
 * components e aquele módulo importa `next/headers`, que só roda no servidor —
 * importá-lo do cliente quebraria o build.
 */

/**
 * Campo-isca. Fica fora da tela e fora da ordem de tabulação, então humano não
 * preenche. O nome é `assunto` de propósito: genérico o bastante pro robô que
 * completa todo input de texto, e sem correspondência com nenhum token de
 * autopreenchimento do browser (`url`, `website`, `organization`...), que é
 * como um gerenciador de senhas poderia preencher sozinho e barrar um cliente.
 */
export const CAMPO_ISCA = 'assunto'

/**
 * Instante em que o formulário foi montado no browser, para medir quanto tempo
 * o preenchimento levou. Vem do cliente, então dá para forjar; serve como
 * filtro barato, não como garantia. Fica em "0" quando o JS não roda, e o
 * servidor trata 0 como "não dá pra medir" em vez de barrar.
 */
export const CAMPO_MONTADO_EM = 'montadoEm'
