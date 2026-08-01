/**
 * Páginas de segmento (/para/pizzaria, /para/hamburgueria, ...).
 *
 * A ideia é rankear para a busca que o lojista realmente faz — "sistema de
 * pedidos para pizzaria", "cardápio digital hamburgueria" — em vez de disputar
 * só "cardápio digital", onde iFood e Goomer já dominam.
 *
 * REGRA IMPORTANTE: cada segmento tem texto próprio (dores, fluxo e FAQ
 * específicos do negócio). Página igual com a palavra trocada é "doorway page"
 * — o Google desindexa o conjunto todo e ainda queima a reputação do domínio.
 * Ao adicionar um segmento novo, escreva conteúdo de verdade; não copie.
 */

export type SegmentPain = { title: string; desc: string }
export type SegmentFaq = { q: string; a: string }

export type Segment = {
  /** Slug da URL: /para/<slug>. */
  slug: string
  /** Nome do negócio no singular, como o lojista se refere a ele. */
  label: string
  /** Título da SERP (~60 caracteres com a marca). */
  metaTitle: string
  /** Descrição da SERP (~155 caracteres). */
  metaDescription: string
  h1: string
  intro: string
  /** Dores concretas do segmento — o miolo do conteúdo único da página. */
  pains: SegmentPain[]
  /** Fluxo de trabalho do dia a dia, na ordem em que acontece na loja. */
  steps: string[]
  faqs: SegmentFaq[]
  keywords: string[]
}

export const SEGMENTS: Segment[] = [
  {
    slug: 'pizzaria',
    label: 'pizzaria',
    metaTitle: 'Cardápio digital e sistema de pedidos para pizzaria',
    metaDescription:
      'Cardápio online para pizzaria com meio a meio, tamanhos, borda e adicionais. Pedido cai no painel na hora, sem comissão por venda. A partir de R$ 29/mês.',
    h1: 'Cardápio digital para pizzaria, com meio a meio e borda do jeito certo',
    intro:
      'Pizza é o pedido mais difícil de anotar por telefone: dois sabores, tamanho, borda, sem cebola em metade. No cardápio digital o cliente monta tudo sozinho, com o preço já calculado, e o pedido chega no painel escrito — sem ruído de ligação e sem pizza saindo errada.',
    pains: [
      {
        title: 'Meio a meio sem confusão',
        desc: 'Grupos de opção com escolha múltipla dão conta de dois sabores, borda recheada e adicionais. Você define o mínimo e o máximo de cada grupo, e o preço soma automático.',
      },
      {
        title: 'Sexta e sábado sem telefone tocando',
        desc: 'No pico, cada ligação atendida é uma pizza que atrasa. Com o link do cardápio, os pedidos entram em paralelo e a cozinha vê a fila na tela em vez de um monte de papel.',
      },
      {
        title: 'Aberto só à noite',
        desc: 'O horário de funcionamento aceita faixa que cruza a meia-noite (18:00 → 01:00), então a loja continua aberta depois das 00:00 e fecha sozinha no fim do expediente.',
      },
    ],
    steps: [
      'Cadastre os sabores por categoria (salgadas, doces, promoções) e monte os grupos de tamanho, borda e adicional.',
      'Compartilhe o link no Instagram e cole o QR Code no balcão e na caixa de entrega.',
      'O pedido cai no painel com sabor, tamanho e observação, e você acompanha do "preparando" ao "a caminho".',
      'No fim da noite, o caixa mostra o total do dia e quais sabores mais saíram.',
    ],
    faqs: [
      {
        q: 'Dá pra vender pizza meio a meio pelo cardápio?',
        a: 'Sim. Você cria um grupo de opções com dois sabores permitidos e define como o preço é calculado nos adicionais — o cliente escolhe e o valor final já aparece no carrinho.',
      },
      {
        q: 'Consigo cobrar a mais pela borda recheada?',
        a: 'Sim. Cada opção dentro de um grupo pode ter um valor adicional próprio, então borda, tamanho e extras somam ao preço da pizza automaticamente.',
      },
      {
        q: 'E se a pizzaria abrir só das 18h à 1h da manhã?',
        a: 'É o padrão suportado: faixas que cruzam a meia-noite funcionam normalmente, e a loja aparece como aberta até o horário de fechamento.',
      },
    ],
    keywords: [
      'cardápio digital para pizzaria',
      'sistema de pedidos para pizzaria',
      'cardápio online pizzaria meio a meio',
      'delivery de pizza sem comissão',
    ],
  },
  {
    slug: 'hamburgueria',
    label: 'hamburgueria',
    metaTitle: 'Cardápio digital e sistema de pedidos para hamburgueria',
    metaDescription:
      'Cardápio online para hamburgueria com combos, ponto da carne e adicionais. Pedidos em tempo real no painel e sem comissão por venda. A partir de R$ 29/mês.',
    h1: 'Cardápio digital para hamburgueria, com adicional e ponto da carne',
    intro:
      'Hambúrguer vende no impulso e vende por foto. O cardápio digital coloca a imagem de cada lanche na frente do cliente, deixa ele escolher bacon a mais, cheddar, ponto da carne e combo com fritas — e manda tudo escrito pra chapa.',
    pains: [
      {
        title: 'Adicional é onde está o lucro',
        desc: 'Cada lanche pode ter seus próprios grupos de adicional com preço por item. O cliente vê a opção na hora do pedido, o que aumenta o ticket sem ninguém precisar oferecer.',
      },
      {
        title: 'Foto boa vende sozinha',
        desc: 'Cada produto aceita várias fotos, e o layout em grade coloca a imagem em primeiro plano — é o formato que funciona pra lanche.',
      },
      {
        title: 'A chapa precisa do pedido escrito',
        desc: 'Ponto da carne, "sem cebola", "maionese à parte": tudo chega no painel como texto, com observação por item, e ninguém depende de bilhete escrito às pressas.',
      },
    ],
    steps: [
      'Monte o cardápio por categoria (artesanais, combos, porções, bebidas) com foto em cada lanche.',
      'Crie os grupos de adicional, ponto da carne e troca de acompanhamento, com o preço de cada opção.',
      'Divulgue o link nos stories e o QR Code na mesa — o cliente pede do balcão ou de casa.',
      'Os pedidos entram na fila do painel e o relatório mostra o combo que mais sai.',
    ],
    faqs: [
      {
        q: 'Consigo cobrar por adicional, tipo bacon extra?',
        a: 'Sim. Adicionais ficam em grupos com valor por opção, então o carrinho soma o extra ao preço do lanche automaticamente.',
      },
      {
        q: 'O cliente escolhe o ponto da carne?',
        a: 'Sim. Basta criar um grupo obrigatório de escolha única com as opções de ponto — vem escrito no pedido que chega na cozinha.',
      },
      {
        q: 'Serve pra atender mesa no salão também?',
        a: 'Serve. Você pode habilitar consumo no local junto com delivery e retirada, e usar o QR Code na mesa pro cliente pedir sem esperar o atendente.',
      },
    ],
    keywords: [
      'cardápio digital para hamburgueria',
      'sistema de pedidos para hamburgueria',
      'cardápio online lanche com adicional',
      'delivery de hamburguer sem comissão',
    ],
  },
  {
    slug: 'lanchonete',
    label: 'lanchonete',
    metaTitle: 'Cardápio digital e sistema de pedidos para lanchonete',
    metaDescription:
      'Cardápio online para lanchonete: salgados, porções e bebidas com pedido pelo celular, controle de caixa e sem comissão. A partir de R$ 29/mês.',
    h1: 'Cardápio digital para lanchonete, no lugar do bloquinho',
    intro:
      'Na lanchonete o pedido vira rasura no papel, o troco sai errado e no fim do dia ninguém sabe quanto entrou. O cardápio digital tira o pedido do bloquinho e o caixa da cabeça: o cliente pede pelo celular e o total do dia fica registrado.',
    pains: [
      {
        title: 'Fila no balcão andando mais rápido',
        desc: 'Com o QR Code no balcão, quem está na fila já pede pelo celular enquanto espera. O atendente cuida da entrega e do pagamento, não de anotar.',
      },
      {
        title: 'Caixa fechando de verdade',
        desc: 'Todo pedido concluído entra no caixa com forma de pagamento. No fim do turno você vê o total em dinheiro, Pix e cartão sem somar nota fiscal na mão.',
      },
      {
        title: 'Cardápio que muda toda semana',
        desc: 'Acabou o salgado? Desative o produto num toque e ele sai do cardápio na hora, sem cliente pedindo o que não tem.',
      },
    ],
    steps: [
      'Cadastre os itens por categoria (salgados, lanches, porções, bebidas) com preço e foto.',
      'Imprima o QR Code e deixe no balcão, na mesa e na vitrine.',
      'Os pedidos aparecem no painel em tempo real, com alerta sonoro quando chega um novo.',
      'No fechamento, o caixa mostra quanto entrou por forma de pagamento.',
    ],
    faqs: [
      {
        q: 'Preciso de computador na loja?',
        a: 'Não. O painel funciona no celular e pode ser instalado como aplicativo na tela de início, com aviso de pedido novo.',
      },
      {
        q: 'Como faço quando um item acaba no meio do dia?',
        a: 'Você desativa o produto no painel e ele deixa de aparecer no cardápio imediatamente, sem precisar apagar nada.',
      },
      {
        q: 'Dá pra usar só pra pedido no balcão, sem delivery?',
        a: 'Dá. Delivery, retirada e consumo no local são independentes — você liga apenas os que a sua loja faz.',
      },
    ],
    keywords: [
      'cardápio digital para lanchonete',
      'sistema de pedidos para lanchonete',
      'cardápio online com QR Code lanchonete',
      'controle de caixa para lanchonete',
    ],
  },
  {
    slug: 'acaiteria',
    label: 'açaiteria',
    metaTitle: 'Cardápio digital e sistema de pedidos para açaiteria',
    metaDescription:
      'Cardápio online para açaiteria com tamanhos e complementos na medida: o cliente monta o açaí e o preço soma sozinho. Sem comissão, a partir de R$ 29/mês.',
    h1: 'Cardápio digital para açaiteria, com o cliente montando o copo',
    intro:
      'Açaí é pedido de montar: tamanho, base, três complementos grátis, leite em pó a mais. Explicar isso no WhatsApp trava o atendimento. No cardápio digital o cliente monta o copo dele com limite de escolhas definido por você — e ninguém precisa conferir nada duas vezes.',
    pains: [
      {
        title: 'Complemento com limite, não com discussão',
        desc: 'Cada grupo tem mínimo e máximo de escolhas: três acompanhamentos inclusos e os demais com valor adicional, sem depender do bom senso de quem atende.',
      },
      {
        title: 'Tamanho de 300ml a 1 litro',
        desc: 'Tamanhos ficam num grupo obrigatório de escolha única, cada um com o seu preço — o cliente escolhe e o carrinho já mostra o valor certo.',
      },
      {
        title: 'Movimento concentrado no calor',
        desc: 'Nos dias de pico os pedidos entram em paralelo pelo link, sem fila de WhatsApp esperando resposta, e a fila de preparo aparece organizada na tela.',
      },
    ],
    steps: [
      'Cadastre os tamanhos como produto e os complementos como grupos de opção.',
      'Defina quantos acompanhamentos entram sem custo e o valor dos extras.',
      'Divulgue o link na bio do Instagram e o QR Code no balcão.',
      'Acompanhe os pedidos e veja no relatório o tamanho e o complemento que mais saem.',
    ],
    faqs: [
      {
        q: 'Consigo dar três complementos grátis e cobrar do quarto em diante?',
        a: 'Sim. O grupo de opções tem mínimo e máximo de escolhas, e você define quais opções têm valor adicional — os primeiros entram sem custo.',
      },
      {
        q: 'Dá pra vender por tamanho de copo?',
        a: 'Sim. Cada tamanho pode ser um produto ou uma opção obrigatória com preço próprio, do 300ml ao litro.',
      },
      {
        q: 'Funciona pra barraca e quiosque, não só loja de rua?',
        a: 'Funciona. O painel roda no celular e o cardápio é só um link, então não depende de estrutura fixa nem de computador.',
      },
    ],
    keywords: [
      'cardápio digital para açaiteria',
      'sistema de pedidos para açaí',
      'cardápio online montar açaí',
      'delivery de açaí sem comissão',
    ],
  },
  {
    slug: 'marmitaria',
    label: 'marmitaria',
    metaTitle: 'Cardápio digital e sistema de pedidos para marmitaria',
    metaDescription:
      'Cardápio online para marmitaria: prato do dia, tamanhos de marmita e pedido antecipado pelo celular. Sem comissão por venda, a partir de R$ 29/mês.',
    h1: 'Cardápio digital para marmitaria, com o prato do dia sempre atualizado',
    intro:
      'Marmitaria vive de dois problemas: o cardápio muda todo dia e o pedido precisa chegar antes das 11h pra dar tempo de produzir. O cardápio digital resolve os dois — você troca o prato do dia em segundos e recebe os pedidos escritos, com o horário de corte respeitado.',
    pains: [
      {
        title: 'Prato do dia sem refazer nada',
        desc: 'Ativar e desativar produto é um toque. O cardápio de terça sai do ar e o de quarta entra, sem apagar o histórico nem recadastrar item.',
      },
      {
        title: 'Pedido antecipado, produção planejada',
        desc: 'O horário de funcionamento define quando a loja aceita pedido. Fora da janela, o cliente vê que está fechada em vez de mandar mensagem que ninguém responde.',
      },
      {
        title: 'Cliente que pede todo dia',
        desc: 'O painel guarda o histórico de quem já comprou, então você identifica o cliente fiel do almoço e sabe o que ele costuma pedir.',
      },
    ],
    steps: [
      'Cadastre os tamanhos de marmita (P, M, G) e os acompanhamentos como opções.',
      'Toda manhã, ative o prato do dia e desative o da véspera.',
      'Mande o link no grupo de WhatsApp dos clientes e no status.',
      'Os pedidos entram no painel com nome e endereço, prontos pra rota de entrega.',
    ],
    faqs: [
      {
        q: 'Dá pra mudar o cardápio todos os dias?',
        a: 'Dá. Cada produto tem um botão de ativo/inativo, então você mantém tudo cadastrado e só liga o que vai sair naquele dia.',
      },
      {
        q: 'Consigo parar de receber pedido depois de um horário?',
        a: 'Sim. O horário de funcionamento controla quando a loja aceita pedido; fora dele o cardápio mostra que está fechada.',
      },
      {
        q: 'Vende marmita por assinatura ou pacote semanal?',
        a: 'Não existe cobrança recorrente do cliente final, mas você pode cadastrar pacotes como produtos (ex.: 5 marmitas) e combinar a entrega com ele.',
      },
    ],
    keywords: [
      'cardápio digital para marmitaria',
      'sistema de pedidos para marmitaria',
      'cardápio online prato do dia',
      'delivery de marmita sem comissão',
    ],
  },
  {
    slug: 'doceria',
    label: 'doceria',
    metaTitle: 'Cardápio digital e sistema de pedidos para doceria',
    metaDescription:
      'Cardápio online para doceria e confeitaria: bolos, docinhos e encomenda com observação. Pedidos no painel e sem comissão, a partir de R$ 29/mês.',
    h1: 'Cardápio digital para doceria, do docinho à encomenda de bolo',
    intro:
      'Doceria vende por foto e vive de encomenda. O problema é a conversa: sabor, recheio, data, quantidade, nome no bolo. No cardápio digital o cliente escolhe as opções e escreve a observação, e o pedido chega organizado em vez de espalhado em vinte mensagens.',
    pains: [
      {
        title: 'Foto em primeiro lugar',
        desc: 'Vários ângulos por produto e layout em grade: o cliente vê o doce antes de ler o preço, que é como esse produto vende.',
      },
      {
        title: 'Encomenda com sabor e recheio',
        desc: 'Grupos de opção dão conta de massa, recheio e cobertura, e o campo de observação recebe a data e o nome do aniversariante.',
      },
      {
        title: 'Pedido em cento, não em unidade',
        desc: 'Cadastre a quantidade certa (cento de docinho, caixa de 6, bolo por kg) com o valor de cada formato, sem cálculo na hora.',
      },
    ],
    steps: [
      'Monte as categorias por tipo (bolos, docinhos, tortas, festas) com foto boa em cada item.',
      'Crie os grupos de massa, recheio e cobertura, com adicional quando houver.',
      'Publique o link na bio do Instagram, que é de onde vem a maior parte do pedido.',
      'Combine data e retirada pelo WhatsApp do pedido que já chegou escrito no painel.',
    ],
    faqs: [
      {
        q: 'O cliente consegue escolher recheio e cobertura?',
        a: 'Sim. Cada produto pode ter vários grupos de opção — massa, recheio, cobertura — com adicional por escolha quando fizer sentido.',
      },
      {
        q: 'Como recebo a data da encomenda?',
        a: 'O cliente escreve no campo de observação do item ou do pedido, e você confirma pelo WhatsApp direto do painel.',
      },
      {
        q: 'Dá pra vender bolo por peso?',
        a: 'Dá. Cadastre cada faixa de peso como opção com o preço correspondente, e o valor final aparece no carrinho.',
      },
    ],
    keywords: [
      'cardápio digital para doceria',
      'sistema de pedidos para confeitaria',
      'catálogo online de bolos e doces',
      'encomenda de bolo pela internet',
    ],
  },
  {
    slug: 'food-truck',
    label: 'food truck',
    metaTitle: 'Cardápio digital e sistema de pedidos para food truck',
    metaDescription:
      'Cardápio online para food truck e barraca: QR Code na janela, pedido pelo celular do cliente e caixa no bolso. Sem comissão, a partir de R$ 29/mês.',
    h1: 'Cardápio digital para food truck, sem depender de estrutura',
    intro:
      'No food truck não tem computador, não tem mesa e às vezes o sinal é ruim. O que tem é fila na janela. Um QR Code colado no vidro deixa o cliente pedir do celular dele enquanto espera, e o painel roda no seu telefone como aplicativo.',
    pains: [
      {
        title: 'Fila que anda com uma pessoa só',
        desc: 'Enquanto você monta o pedido, os próximos já estão pedindo pelo celular. Um atendente dá conta do movimento que antes exigia dois.',
      },
      {
        title: 'Endereço muda, o link não',
        desc: 'Você trabalha em praça diferente cada noite, mas o link e o QR Code continuam os mesmos. Basta atualizar o endereço no painel.',
      },
      {
        title: 'Caixa no bolso',
        desc: 'O painel instala como app no celular, avisa com som quando entra pedido e fecha o caixa do dia sem papel nenhum.',
      },
    ],
    steps: [
      'Cadastre o cardápio enxuto: o que realmente sai na rua.',
      'Imprima o QR Code e cole na janela do truck e no cavalete.',
      'Instale o painel no celular pra receber o alerta de pedido novo.',
      'No fim do evento, confira o total do caixa e o item mais vendido.',
    ],
    faqs: [
      {
        q: 'Funciona sem internet boa?',
        a: 'O cardápio é leve e o painel funciona como aplicativo instalado, com tela offline de emergência — mas para receber pedido novo é preciso conexão, mesmo que fraca.',
      },
      {
        q: 'Preciso de maquininha ou computador?',
        a: 'Não. Você recebe em dinheiro, Pix ou cartão como já recebe hoje; o sistema registra a forma de pagamento no pedido.',
      },
      {
        q: 'Uso o mesmo cardápio em pontos diferentes?',
        a: 'Sim. O link e o QR Code são fixos; você só atualiza o endereço e o horário no painel conforme o ponto do dia.',
      },
    ],
    keywords: [
      'cardápio digital para food truck',
      'sistema de pedidos para food truck',
      'QR Code cardápio barraca de lanche',
      'cardápio online para trailer de lanche',
    ],
  },
  {
    slug: 'restaurante',
    label: 'restaurante',
    metaTitle: 'Cardápio digital e sistema de pedidos para restaurante',
    metaDescription:
      'Cardápio online para restaurante com QR Code na mesa, delivery, retirada e controle de caixa. Sem comissão por venda, a partir de R$ 29/mês.',
    h1: 'Cardápio digital para restaurante, na mesa e no delivery',
    intro:
      'Restaurante tem duas frentes: o salão e a entrega. O cardápio digital atende as duas com o mesmo cadastro — QR Code na mesa pra quem está no salão e link pra quem pede de casa — e tudo cai na mesma fila de pedidos.',
    pains: [
      {
        title: 'Cardápio impresso que fica velho',
        desc: 'Preço mudou? Você altera no painel e o cardápio de todas as mesas está atualizado no mesmo instante, sem reimprimir nada.',
      },
      {
        title: 'Salão e delivery na mesma tela',
        desc: 'Consumo no local, retirada e entrega convivem no mesmo cardápio, cada um com a sua regra, e o pedido identifica de onde veio.',
      },
      {
        title: 'Relatório pra decidir o menu',
        desc: 'O painel mostra o que mais vende e em que horário, o que ajuda a cortar prato encalhado e reforçar o que dá margem.',
      },
    ],
    steps: [
      'Monte o cardápio por categoria (entradas, principais, bebidas, sobremesas).',
      'Coloque o QR Code nas mesas e o link nas redes e no Google.',
      'Os pedidos do salão e do delivery entram na mesma fila do painel.',
      'Feche o caixa por turno e acompanhe os relatórios de desempenho.',
    ],
    faqs: [
      {
        q: 'Serve como cardápio de mesa por QR Code?',
        a: 'Serve. Você gera o QR Code no painel, imprime e o cliente abre o cardápio no próprio celular — com a opção de consumo no local ativada.',
      },
      {
        q: 'Dá pra atender delivery e salão ao mesmo tempo?',
        a: 'Dá. Os modos de entrega são independentes e o pedido mostra se é entrega, retirada ou consumo no local.',
      },
      {
        q: 'Tenho mais de uma unidade. Funciona?',
        a: 'Sim, no plano Pro: a mesma conta gerencia mais de uma loja, cada uma com seu cardápio e seu link.',
      },
    ],
    keywords: [
      'cardápio digital para restaurante',
      'cardápio QR Code para mesa',
      'sistema de pedidos para restaurante',
      'delivery próprio para restaurante',
    ],
  },
]

export function getSegment(slug: string): Segment | undefined {
  return SEGMENTS.find((s) => s.slug === slug)
}
