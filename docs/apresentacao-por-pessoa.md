# Roteiro individual — quem fala o quê

Cada um lê **só a sua seção**. O roteiro geral (pré-voo, plano B, perguntas da banca)
continua em `docs/apresentacao-tcc.md`.

## A ordem da apresentação

| Quando | Quem | O quê |
|---|---|---|
| 0:00 – 4:00 | **Marcos** | Abertura, problema, solução e a tela inicial ao vivo |
| 4:00 – 7:00 | **Thiago** | Painel do lojista: pedidos, caixa, desempenho, clientes |
| 7:00 – 10:00 | **Gustavo** | Painel do lojista: estoque, ficha técnica e entrada de NF-e |
| 10:00 – 14:30 | **Gustavo** | Cardápio, montagem do pedido e pagamento |
| 14:30 – 15:00 | **Thiago** | Volta ao painel: o pedido do Gustavo chegou |
| 15:00 – 18:00 | **Thiago** | Arquitetura e as três decisões técnicas |
| 18:00 – 20:00 | **Marcos** | Modelo de negócio, validação e encerramento |

## Um ajuste no plano, e por quê

O plano original era: tela inicial → painel → cardápio. Mantive essa ordem, com **uma
adição de 30 segundos**: quando o Gustavo finalizar o pedido no cardápio, o Thiago
volta ao painel e mostra esse pedido aparecendo.

O motivo é simples. O momento mais forte que vocês têm é o pedido nascendo no celular
e caindo no painel na frente da banca. Mostrando o painel antes e o cardápio depois,
esse momento se perde — a banca vê os pedidos já lá, sem ligar uma coisa à outra. Com
a volta de 30 segundos, a ordem de vocês fica de pé **e** o encaixe acontece.

## A saída do Igor

O grupo passou a ser de três. A parte que era dele foi dividida assim: o **Gustavo**
assume o estoque ao vivo (7:00 – 10:00), e o **Thiago** assume o banco — a decisão 01,
o slide 7 e toda pergunta de banco, RLS e segurança na arguição.

A ordem e os tempos não mudaram. O que mudou é que o Gustavo agora tem dois blocos
seguidos, das 7:00 às 14:30: estoque primeiro, cardápio depois. São sete minutos e
meio falando sozinho — **é o trecho que mais precisa de ensaio**, porque é onde o
cansaço aparece e onde a banca pode perder o fio entre um assunto e outro. Marque uma
pausa clara entre os dois blocos.

---

# MARCOS — abertura e fechamento

> **Seu papel:** você abre e você fecha. É o fio da narrativa: a banca entende o
> problema por você e sai com a conclusão por você. Você não precisa explicar código
> em nenhum momento — se vier pergunta técnica, passe para o Thiago.

## Bloco 1 — Abertura (0:00 – 4:00)

### Slide 1 — Capa

Apresente os três pelo nome e diga o que cada um fez, em uma frase. Depois:

> "O Cardápio Hub é uma plataforma onde o restaurante vende pelo próprio link, com a
> própria marca, sem pagar comissão por pedido. É um sistema em produção, no ar, e é
> ele que a gente vai mostrar funcionando hoje."

### Slide 2 — O problema

> "Hoje, um restaurante que quer vender online escolhe entre duas saídas, e as duas
> são ruins. Na primeira, ele entra num marketplace: o pedido chega, mas uma fatia
> grande do valor fica com a plataforma, e o cliente passa a ser da plataforma, não
> dele. Na segunda, ele vende pelo WhatsApp: não paga comissão, mas também não tem
> sistema nenhum — é pedido no bloquinho, erro de anotação, nenhum controle de caixa
> ou de estoque."

### Slide 3 — 12% a 30%

Deixe o número na tela e fale devagar:

> "De 12% a 30% de comissão sobre cada pedido. Num ticket de 50 reais, são 6 a 15
> reais que saem da margem do restaurante — em todo pedido, todos os dias. Para
> comparar: a assinatura mais barata do nosso sistema custa 29 reais por mês. Menos
> do que o marketplace leva em três pedidos."

### Slide 4 — A solução

> "O que a gente construiu não é só um cardápio bonito. É a operação inteira do
> restaurante: a vitrine que o cliente vê, o painel onde o pedido entra, o caixa, o
> estoque e os relatórios."

### Slide 5 — A tese

> "A tese do trabalho é essa: o canal de venda é do lojista, não do intermediário.
> O link é dele, o cliente é dele, e a gente cobra assinatura — nunca um pedaço da
> venda."

### Ao vivo — a tela inicial (aba 1)

Abra `cardapiohub.com` e mostre, sem pressa:

1. A página inicial — a vitrine do produto.
2. Role até os **planos** e mostre os três preços.
3. Role até o **formulário de contato**.

> "É por aqui que um restaurante chega até nós: ele preenche esse formulário, cai
> como lead no nosso painel administrativo, e a gente liga para montar a loja junto
> com ele. Esse processo tem roteiro de atendimento documentado — não é improviso."

**Passe a bola em voz alta:** *"Agora o Thiago vai mostrar o painel que esse lojista
recebe."*

## Bloco 2 — Fechamento (18:00 – 20:00)

### Slide 8 — Modelo de negócio

> "São três planos: 29, 69 e 149 reais por mês, por loja. O ponto não é a tabela, é a
> estrutura: a nossa receita é fixa e previsível, e não cresce quando o restaurante
> vende mais. A margem do crescimento dele fica com ele."

### Slide 9 — Validação

> "Isso não é um protótipo de laboratório. Está no ar, com domínio próprio, pagamento
> integrado e uma rotina diária que gera as cobranças sozinha. Tem painel
> administrativo, controle de acesso por papel e um processo de onboarding
> documentado."

Sobre os próximos passos, seja direto: importação automática de notas fiscais,
programa de entregadores — **já implementado e fechado por uma chave de recurso** — e
aplicativo nativo.

### Slide 10 — Encerramento

> "A gente fecha voltando para onde começou: o canal de venda é do lojista, não do
> intermediário. Obrigado."

O slide traz Provérbios 16:9 acima de "Quem responde o quê": leia o versículo em voz alta antes do "Obrigado".

Deixe o slide 10 na tela durante a arguição: os papéis de cada um ficam à vista.

## Na arguição, você responde

Escopo, metodologia, pesquisa, modelo de negócio, concorrência, próximos passos.

**Pergunta que é sua:** *"Quem são os concorrentes?"*

> "Marketplaces como iFood cobram comissão e ficam com o cliente. Geradores de
> cardápio em link levam o pedido para o WhatsApp e param aí. O nosso vai até o
> fim: caixa, estoque e relatório. É operação, não só vitrine."

**Se vier pergunta de banco de dados, segurança ou código:** não arrisque. Diga
*"o Thiago trabalhou nessa parte"* e passe. Isso não pega mal — pega mal é responder
errado.

---

# THIAGO — painel do lojista e arquitetura

> **Seu papel:** você mostra o que o lojista ganha no dia a dia e, no fim, explica
> como o sistema é montado. Com a saída do Igor, você é o mais forte tecnicamente do
> grupo: o banco é seu, e é para você que os outros dois vão empurrar qualquer
> pergunta pesada da banca.

## Bloco 1 — O painel (4:00 – 7:00) · aba 2

Comece dizendo onde a banca está:

> "Esse é o painel que o dono do restaurante recebe. Esta é a nossa loja de
> demonstração, com 35 dias de histórico gerado por script, para vocês verem os relatórios."

### Pedidos (1,5 min)

1. Mostre o quadro com as colunas: recebido, em preparo, pronto, a caminho.
2. **Arraste um card** de uma coluna para a outra.

> "Arrastar aqui muda o status de verdade no banco, e o cliente acompanha pela página
> do pedido dele — ele não precisa ligar para perguntar se saiu."

3. Aponte o pedido agendado para outro dia.

### Caixa (45 s)

> "O caixa do dia, separado por dinheiro, Pix e cartão, com exportação em CSV para o
> contador. Isso aqui é o que o dono olha quando fecha a noite."

### Desempenho (45 s)

Mostre os períodos de 7, 30 e 90 dias, o faturamento por dia da semana e os produtos
mais vendidos.

> "Faturamento por dia da semana, produto mais vendido, horário de pico. Ele abre no
> domingo à noite e sabe o que comprar na segunda — é isso que o bloquinho nunca deu."

### Clientes (30 s)

> "O sistema identifica quem já pediu antes e marca os recorrentes. São 31 clientes
> aqui, 8 deles com selo de recorrente e link direto do WhatsApp."

**Passe a bola:** *"O Gustavo vai mostrar a parte que nenhum concorrente de cardápio
digital tem."*

## Bloco 2 — O pedido do Gustavo chegou (14:30 – 15:00) · aba 2

Assim que o Gustavo finalizar o pedido, **volte para a aba do painel e recarregue uma
vez**.

> "Esse é o pedido que o Gustavo acabou de fazer, agora, no celular. Ele não abriu o
> WhatsApp de ninguém: entrou no sistema, já está na coluna de recebidos e já contou
> no caixa do dia."

É o momento mais forte da apresentação. Deixe dois segundos de silêncio depois.

> ⚠️ Se o pedido não aparecer, recarregue **uma vez só**. Se ainda assim não vier,
> não insista: *"a rede aqui está lenta"*, mostre o quadro que já tem pedidos e siga.

## Bloco 3 — Arquitetura (15:00 – 18:00)

### Slide 6 — Arquitetura (você)

Não leia as quatro camadas uma por uma.

> "São quatro camadas, mas a decisão que importa está na de baixo. Em cima, o cardápio
> do cliente, renderizado no servidor. No meio, o painel do lojista, que instala como
> aplicativo no celular e recebe notificação de pedido novo. Embaixo, o banco — e é
> dele que eu vou falar agora."

### As três decisões (sem slide próprio)

O deck não tem slide só para as decisões. Conte a 01 durante o slide 6 (Arquitetura), com calma, e resuma a 02 e a 03. As falas abaixo servem também de resposta se a banca pedir mais.

A **decisão 01 é a pergunta mais provável da banca**. Apresente e já responda antes de
perguntarem:

> "A primeira decisão é a mais importante: o isolamento entre lojas não está no
> código, está no banco. Cada loja só enxerga os próprios dados por uma política de
> Row Level Security do PostgreSQL, aplicada linha a linha."

> "A diferença é grande. Se o filtro estivesse na aplicação, bastaria alguém escrever
> uma consulta nova amanhã e esquecer o `where` para vazar dado de uma loja na outra.
> Como a regra está no banco, ela vale para qualquer caminho de acesso — inclusive
> para um código que ainda não existe."

> "A segunda: criar pedido e baixar estoque não são código da aplicação, são
> funções e gatilhos dentro do banco, transacionais e idempotentes. O saldo do estoque
> só muda por movimentação registrada, e o livro-razão sempre fecha com ele."

> "A terceira: o cardápio é renderizado no servidor. Ele é a vitrine do restaurante —
> precisa abrir rápido no celular do cliente, muitas vezes em rede ruim, e precisa ser
> achado no Google. HTML pronto, em vez de uma tela em branco esperando o JavaScript
> baixar."

### Slide 7 — O estoque, por baixo (você)

Retome o que o Gustavo mostrou ao vivo, agora pelo lado técnico:

> "Esse é o estoque que o Gustavo mostrou funcionando. Por baixo é a decisão 02: a
> ficha técnica diz o que sai por unidade vendida, o gatilho baixa na hora do pedido,
> e o livro-razão é imutável — é isso que faz o saldo sempre fechar."

## Na arguição, você responde

Arquitetura geral, integrações, pagamento, deploy, PWA e notificações — **e tudo que
era do Igor**: banco de dados, RLS, transações, gatilhos, estoque, concorrência de
pedidos e segurança. Os outros dois vão passar essas perguntas para você.

**As quatro que mais caem:**

- *"Por que não usar só um framework de frontend?"* → a decisão 03, acima.
- *"Como garantem que uma loja não vê o dado de outra?"* → a decisão 01, acima.
- *"E se dois pedidos chegarem ao mesmo tempo?"* → "A criação do pedido é uma função
  transacional no banco, e o limite de pedidos do plano é validado lá dentro. Duas
  abas abertas não burlam."
- *"O estoque pode ficar negativo. Isso não é um bug?"* → "É uma decisão de produto.
  Bloquear a venda por falta de insumo cadastrado faria o restaurante perder venda
  real por erro de cadastro. O sistema registra e alerta, mas nunca impede o pedido —
  quem decide é o lojista."

---

# GUSTAVO — o estoque, o cardápio e o pedido

> **Seu papel:** com a saída do Igor, você ficou com dois blocos seguidos. Primeiro o
> estoque, que é o diferencial do trabalho; depois o lado de quem compra, que é a
> interface que você construiu. Termine fazendo um pedido de verdade: ele vai
> aparecer no painel logo depois.
>
> Você **apresenta** o estoque, mas não precisa **defender** o banco: pergunta de RLS,
> gatilho ou transação vai para o Thiago. Mostrar e explicar o que a tela faz é seu;
> o que acontece por baixo é dele.

## Bloco 1 — Estoque (7:00 – 10:00) · aba 3

Abra dizendo o que torna isso diferente:

> "Essa é a parte que nenhum concorrente de cardápio digital tem. Os outros param no
> pedido. Aqui o pedido mexe no estoque."

### Ficha técnica (1 min)

1. Abra **Ficha técnica** e escolha um produto — o Smash Clássico.
2. Mostre a composição: quanto de blend, de queijo e de pão sai por unidade vendida.

> "Isso é a ficha técnica: quanto de cada insumo sai quando esse produto é vendido.
> Ela vale para o produto e para cada adicional — se o cliente pede bacon extra, o
> bacon extra também baixa."

3. Mostre o custo e a margem calculados.

> "Com isso o sistema sabe o custo real do prato, não o chute. Ele mostra o CMV e a
> margem de cada item."

### Movimentações (1 min)

1. Abra **Movimentações**.
2. Aponte uma saída ligada a um pedido.

> "Esse é o livro-razão do estoque. Toda entrada e toda saída está aqui, com link para
> o pedido ou a nota que a originou. O lojista não consegue editar nem apagar uma
> movimentação — o saldo só muda por movimentação registrada, e é por isso que o
> livro-razão sempre fecha com o saldo."

### Entrada de NF-e (1 min)

1. Abra **Entrada NF-e**.

> "A entrada vem da nota do fornecedor. O lojista sobe o XML da NF-e, o sistema lê os
> itens e ele liga cada item da nota a um insumo, com conversão de unidade — uma caixa
> com doze unidades vira doze. Na próxima nota do mesmo fornecedor, isso já vem ligado
> sozinho."

> "E o sistema guarda o custo médio ponderado. Se o preço de um insumo subir mais de
> 10% em relação à última compra, ele avisa no topo da tela até alguém marcar que
> está ciente."

### A virada para o seu segundo bloco

Este é o único ponto da apresentação em que **você passa a bola para você mesmo**.
Não emende os dois blocos como se fosse um só: faça uma pausa, respire, e anuncie a
troca de assunto em voz alta, para a banca mudar de lugar junto com você.

> "Vocês acabaram de ver o estoque mexendo sozinho a partir de um pedido. Agora eu
> vou mostrar de onde esse pedido vem — e o pedido que eu fizer daqui a pouco vai
> voltar nessa tela."

## Bloco 2 — O cardápio e o pedido (10:00 – 14:30) · aba 1 e celular

### O cardápio (1 min)

1. Mostre o topo: logo, banner, nome da loja e **"Aberto agora"**.

> "O tema é configurável pelo lojista: cor, fonte, logo, banner e o layout do
> cardápio. Essa loja é a Brasa Burger, uma hamburgueria — a loja de um japonês ou de
> uma pizzaria fica com a cara dela, não com a nossa."

2. Aponte o aviso do topo e o tempo de entrega.
3. Mostre a busca e as categorias.
4. Mostre as três formas de pedir: **entrega, retirada e mesa**.

### O produto com opções (1,5 min) — **a parte mais importante**

1. Abra o **Smash Clássico**.
2. Mostre o grupo **"Ponto da carne"**, marcado como obrigatório.

> "Esse grupo é obrigatório: o cliente não consegue adicionar ao carrinho sem
> escolher. É isso que evita a ligação de volta perguntando o ponto da carne."

3. Mostre os **adicionais pagos** e marque um — o preço recalcula na hora.
4. Mostre a opção de **retirar ingredientes**.

> "E tem o inverso também: o cliente tira a cebola sem precisar escrever num campo de
> observação que alguém pode não ler."

5. Adicione ao carrinho.

### O carrinho e a entrega (1 min)

1. Mostre o carrinho com o item e os adicionais discriminados.
2. Escolha **entrega** e selecione **Centro**.

> "A taxa muda por bairro — o lojista cadastra as zonas de entrega dele. E cada zona
> pode ter pedido mínimo próprio."

> ⚠️ **Escolha Centro ou Jardim Paulista, não os outros dois.** As quatro zonas da
> demo são:
>
> | Bairro | Taxa | Pedido mínimo |
> |---|---|---|
> | Centro | R$ 6,00 | R$ 20,00 |
> | Jardim Paulista | R$ 8,00 | R$ 20,00 |
> | Vila Nova | R$ 9,50 | **R$ 30,00** |
> | Parque das Flores | R$ 12,00 | **R$ 40,00** |
>
> Um Smash Clássico sai por R$ 24,90. Nos dois últimos bairros o pedido **não
> fecha**, e aí o Thiago fica sem o pedido para mostrar no painel. No Centro passa.

3. **Se quiser mostrar a regra funcionando** (opcional, 15 s), selecione *Parque das
   Flores*, mostre o aviso de pedido mínimo bloqueando, e volte para o Centro:

> "Cada bairro tem seu mínimo, e o sistema não deixa fechar abaixo dele — o lojista
> não sai no prejuízo com uma entrega longa de pedido pequeno."

4. Aplique um **cupom** de desconto.

### O pagamento (1 min) — **cuidado com o que você fala aqui**

1. Mostre as formas de pagamento: dinheiro, cartão e Pix.

> "O cliente escolhe como vai pagar. Nessa loja o pagamento é na entrega: dinheiro,
> cartão na maquininha, ou Pix na chave que aparece aqui. Se for dinheiro, ele informa
> para quanto precisa de troco."

2. Só então acrescente, se tiver tempo:

> "O sistema também suporta pagamento online por Pix, que o lojista liga conectando a
> conta do Mercado Pago dele. Nessa loja de demonstração está desligado, porque o
> dinheiro cairia numa conta real."

> ⚠️ **Não diga "o cliente paga aqui" sem essa ressalva.** Se a banca perguntar onde
> está a cobrança e a resposta for confusa, a demo perde credibilidade. A frase certa
> é *"o cliente escolhe a forma de pagamento; o pagamento online existe e está
> desligado nessa loja"*.

### Finalizar (30 s)

1. Preencha os dados e **finalize o pedido**.
2. Mostre a página de acompanhamento do pedido.

> "Repare numa coisa: não abriu o WhatsApp de ninguém. O pedido entrou no sistema, e o
> cliente acompanha o status por essa página."

**Passe a bola:** *"Thiago, esse pedido chegou aí?"* — e o Thiago volta ao painel.

## Na arguição, você responde

Interface, responsividade, experiência do cliente, acessibilidade, PWA — e o que as
telas de estoque **fazem**. Como elas funcionam por dentro é do Thiago.

**Pergunta provável:** *"Funciona bem no celular?"*

> "Foi feito primeiro para o celular — é onde o cliente de delivery está. O pedido
> que eu acabei de fazer saiu do celular e caiu direto no painel do Thiago."

---

## Combinados entre os três

- **Passem a bola em voz alta**, pelo nome, como está escrito em cada bloco. Troca
  silenciosa deixa a banca sem saber para onde olhar.
- **Combinem um sinal para quando alguém travar.** Basta o colega assumir com
  *"complementando…"*. Travar acontece; dez segundos de silêncio é que pesam.
- **Ninguém corrige ninguém na frente da banca.** Se alguém falar algo impreciso,
  quem souber complementa depois, sem dizer que o outro errou.
- **Ensaiem uma vez inteiro, com cronômetro.** Uma vez só já corta metade dos
  tropeços — principalmente as trocas de quem fala, que é onde costuma travar.
