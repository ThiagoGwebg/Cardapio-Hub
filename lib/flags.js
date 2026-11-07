/**
 * Interruptores de recurso que ainda não está aberto ao público.
 *
 * Um booleano só, consultado em todos os pontos onde o recurso aparece — rota,
 * server action, rodapé, sitemap e llms.txt —, para que abrir ou fechar seja
 * uma linha e não uma caçada. Fechar em só um desses lugares é o erro que já
 * aconteceu aqui: a página de entregador estava sem link visível na cabeça de
 * quem construiu, mas no ar, no rodapé, no sitemap e no llms.txt, e recebeu
 * cadastro de gente de fora.
 */

/**
 * Cadastro de entregador parceiro (/entregadores).
 *
 * Fechado: a rota responde 404, a server action recusa e nada mais aponta para
 * ela. Para reabrir, troque para `true` — não há mais nada a fazer.
 *
 * De propósito o /entregadores NÃO entra no disallow do robots.txt enquanto
 * estiver fechado: bloquear ali impediria o Google de buscar a URL e ver o
 * 404, e ela continuaria indexada. Deixando responder 404 e tirando do
 * sitemap, ela sai do índice sozinha.
 */
export const CADASTRO_ENTREGADOR_ABERTO = false
