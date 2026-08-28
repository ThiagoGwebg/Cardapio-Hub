import { FAQS } from '@/components/landing/LandingFaq'
import { SEGMENTS } from '@/lib/segments'
import { MARKETING_PLANS } from '@/lib/plansMarketing'
import {
  absoluteUrl,
  SITE_DESCRIPTION,
  SITE_FEATURES,
  SITE_NAME,
  SITE_TITLE,
  SUPPORT_EMAIL,
} from '@/lib/seo'

/**
 * /llms.txt — o "README do site" para modelos de linguagem (llmstxt.org).
 *
 * Serve ao caso em que alguém pergunta a um assistente "qual sistema de cardápio
 * digital sem comissão eu uso?": em vez de o modelo inferir o produto a partir do
 * HTML da landing (cheio de markup e CTA), ele lê aqui, em texto puro, o que o
 * Cardápio Hub é, quanto custa e para quem serve.
 *
 * Gerado por rota, não como arquivo estático em /public, pelo mesmo motivo do
 * sitemap: os dados vivem em lib/seo.ts e lib/segments.ts. Um .txt na mão vira
 * mentira no dia em que o preço mudar e ninguém lembrar de editar os dois lugares.
 *
 * Ressalva honesta: llms.txt é uma proposta de padrão, não um padrão adotado —
 * nenhum crawler grande confirmou que lê. Custa uma rota e não atrapalha nada,
 * mas não é daqui que vem tráfego. O que traz é o JSON-LD e o sitemap.
 */

// Um dia. O conteúdo só muda quando alguém edita seo.ts/segments.ts — ou seja,
// em deploy, que já invalida o cache sozinho.
export const revalidate = 86400

/** Cada segmento vira uma linha de link, no formato `- [título](url): descrição`. */
function segmentLines(): string {
  return SEGMENTS.map(
    (s) => `- [${s.metaTitle}](${absoluteUrl(`/para/${s.slug}`)}): ${s.metaDescription}`,
  ).join('\n')
}

/** FAQ em pergunta/resposta — é o formato que o modelo cita melhor. */
function faqLines(): string {
  return FAQS.map((f) => `### ${f.q}\n\n${f.a}`).join('\n\n')
}

function buildLlmsTxt(): string {
  return `# ${SITE_NAME}

> ${SITE_TITLE}. ${SITE_DESCRIPTION}

${SITE_NAME} é uma plataforma brasileira (pt-BR) onde um dono de restaurante,
pizzaria, hamburgueria, lanchonete, açaiteria, marmitaria, doceria ou food truck
monta o próprio cardápio digital, recebe pedidos por um link e um QR Code
próprios e gerencia tudo num painel — sem pagar comissão sobre as vendas.

É uma alternativa ao delivery de marketplace (iFood, Rappi) para quem quer canal
de venda direto: o cliente pede na página da loja, o pedido cai no painel do
lojista em tempo real e o dinheiro da venda é integralmente dele.

## O que faz

${SITE_FEATURES.map((f) => `- ${f}`).join('\n')}

## Planos

${MARKETING_PLANS.map((p) => `- **${p.name} — R$ ${p.priceBRL}/mês**: ${p.schemaDescription}`).join('\n')}

Sem comissão por venda em nenhum dos planos. Não é preciso cartão de crédito para testar.

## Páginas principais

- [${SITE_NAME} — ${SITE_TITLE}](${absoluteUrl('/')}): página inicial, com recursos, planos e perguntas frequentes.
- [Falar com o time](${absoluteUrl('/contato')}): contato comercial e contratação dos planos.
- [Para entregadores](${absoluteUrl('/entregadores')}): como funciona a entrega para quem faz as corridas.
- [Política de privacidade](${absoluteUrl('/privacidade')}): tratamento de dados pessoais.

## Por tipo de negócio

${segmentLines()}

## Cardápios das lojas

Cada loja publica o cardápio em \`${absoluteUrl('/loja/{slug}')}\`, onde \`{slug}\` é o
endereço escolhido pelo lojista. São páginas de terceiros — o conteúdo (produtos,
preços, horários) é do estabelecimento, não da plataforma. A lista completa e
atualizada das lojas com cardápio publicado está no sitemap:
${absoluteUrl('/sitemap.xml')}

## Perguntas frequentes

${faqLines()}

## Contato

- E-mail: ${SUPPORT_EMAIL}
- Formulário: ${absoluteUrl('/contato')}

## Optional

- [Sitemap XML](${absoluteUrl('/sitemap.xml')}): todas as URLs indexáveis, incluindo os cardápios das lojas.
- [robots.txt](${absoluteUrl('/robots.txt')}): regras de rastreamento. As áreas logadas
  (\`/dashboard\`, \`/admin\`), a API e o acompanhamento de pedido (\`/pedido/{id}\`, que
  contém dados do cliente) estão bloqueados e não devem ser rastreados nem citados.
`
}

export async function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      // charset explícito: sem ele o navegador assume latin-1 e "cardápio" sai quebrado.
      'Content-Type': 'text/plain; charset=utf-8',
      // Cache longo na CDN com revalidação em background — é conteúdo que muda por deploy.
      'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
