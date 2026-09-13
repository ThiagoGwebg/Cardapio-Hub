# Loja de demonstração

Conta pronta para mostrar o sistema a um prospecto sem precisar de uma loja real.

| | |
|---|---|
| Cardápio público | https://www.cardapiohub.com/loja/demo |
| Painel | https://www.cardapiohub.com/login |
| Login | `demo@cardapiohub.com` |
| Senha | `demo1234` |
| Plano | Pro (sem cobrança — a loja nunca é suspensa) |

A loja é **Brasa Burger**, uma hamburgueria fictícia com 5 categorias, 20 produtos,
4 bairros de entrega, 3 cupons e 105 pedidos espalhados pelos últimos 35 dias — é esse
histórico que faz Desempenho, Caixa e Clientes terem gráfico em vez de tela vazia.

O slug `demo` está em `INTERNAL_STORE_SLUGS` (`lib/seo.ts`): o cardápio sai do sitemap e
vai com `noindex`, então não concorre no Google com as lojas de verdade.

## O que dá para mostrar em cada tela

- **Cardápio público** (`/loja/demo`) — tema personalizado (cor, fonte, logo, banner,
  layout em grade), aviso no topo, busca, e o carrinho com grupos de opção: peça um
  *Smash Clássico* para ver ponto da carne (obrigatório), adicionais pagos e "retirar
  ingredientes". O checkout é **pelo sistema**: o pedido cai no painel, sem abrir WhatsApp.
- **Início** — faturamento do dia, pedidos de hoje e últimos pedidos.
- **Pedidos** — quadro ao vivo com um pedido em cada coluna (recebido, em preparo, pronto,
  a caminho) e um agendado para amanhã. Arrastar entre colunas muda o status de verdade.
- **Caixa** — entradas do dia separadas por dinheiro, Pix e cartão, com exportação em CSV.
- **Desempenho** — 7/30/90 dias, faturamento por dia da semana, top produtos, horários de
  pico e divisão entre entrega/retirada/mesa.
- **Clientes** — 31 clientes, 8 deles recorrentes com selo VIP e link direto do WhatsApp.
- **Meus Links** — link do cardápio e QR Code para imprimir.

## Resetar a demo

Depois de uma apresentação em que o prospecto mexeu na loja (ou quando o histórico ficar
velho demais), devolva tudo ao estado de vitrine:

```bash
node scripts/seed-demo.mjs
```

O script apaga cardápio, pedidos e histórico **apenas da loja demo** e semeia de novo, com
os pedidos recalculados para as datas atuais. Ele também redefine a senha — quem estiver
logado na demo naquele momento cai para a tela de login.

## Trocar o conteúdo

- Produtos, preços, bairros, cupons e clientes: `scripts/demo-menu.mjs`.
- Imagens: coloque os arquivos em `scripts/demo-assets/` usando a `key` do produto como
  nome (`smash-classico.jpg`, `logo.svg`, `banner.svg`), e rode:

```bash
node scripts/seed-demo-assets.mjs && node scripts/seed-demo.mjs
```

## Detalhes que valem saber

- **Sem WhatsApp cadastrado.** Um número inventado cairia no celular de um desconhecido.
  Se quiser mostrar o botão de WhatsApp, cadastre um número seu em Configurações da loja.
- **Fotos do Pexels.** As 20 fotos de produto vêm do Pexels (licença comercial livre, sem
  atribuição obrigatória); logo e banner são arte própria em SVG. A procedência de cada
  imagem está em `scripts/demo-assets/CREDITOS.md`.
- **O `noindex` do slug `demo` só vale depois do deploy.** A loja já está no ar em produção,
  mas a exclusão do sitemap vive em `lib/seo.ts` — enquanto essa mudança não subir, o
  cardápio da demo é indexável.
- **A demo entra nas contas do `/admin`.** Ela aparece na lista de lojas e soma nas
  estatísticas da plataforma — desconte-a ao olhar os números do negócio.
