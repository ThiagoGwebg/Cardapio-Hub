# Roteiro da apresentação do TCC — Cardápio Hub

Apresentação com demonstração **ao vivo em produção** (https://www.cardapiohub.com).
Montado para **17 minutos + arguição**; cada bloco tem o tempo e o que cortar primeiro
se o relógio apertar.

Loja de demonstração, credenciais e como resetar: `docs/loja-demo.md`.

Os **10 slides** da banca estão em:
<https://claude.ai/artifact/DbpGy7Ed3peLsVyvwHmW6Q>
Cada slide traz a fala correspondente nas notas do apresentador. Baixe o PDF pela
própria página **antes do dia** e leve no computador — a aba 4 do pré-voo é esse
arquivo local, não o link.

---

## 1. Pré-voo — 30 minutos antes

Esta parte não é opcional. Metade das demos que dão errado dão errado aqui.

### Aquecer as páginas (o mais importante)

As páginas são renderizadas no servidor e hibernam. Medido em 16/11/2026, **em acesso
frio**:

| O quê | Tempo frio |
|---|---|
| Cardápio `/loja/demo` | 3 a 4 s |

Depois de aquecidas, são instantâneas. Então **abra cada uma destas URLs uma vez**
antes de subir no palco, e **não feche o navegador**:

- [ ] https://www.cardapiohub.com/
- [ ] https://www.cardapiohub.com/loja/demo
- [ ] Abrir um produto com grupos de opção (**Smash Clássico**) e fechar
- [ ] https://www.cardapiohub.com/login → entrar no painel da demo
- [ ] Clicar uma vez em cada aba que vai mostrar: Pedidos, Caixa, Desempenho

### Preparar as abas

Deixe tudo aberto **antes**, na ordem da demo. Trocar de aba é rápido; digitar URL
na frente da banca é lento e dá erro de digitação.

1. Aba 1 — cardápio `/loja/demo`
2. Aba 2 — painel, em **Pedidos**
3. Aba 3 — painel, em **Desempenho**
4. Aba 4 — os slides

### Checklist da máquina

- [ ] **Celular no 4G** (não no Wi-Fi do campus) com o cardápio da demo já aberto
- [ ] Notificações do sistema **silenciadas** (Windows: Assistente de Foco)
- [ ] Zoom do navegador em **110–125%** — a banca lê de longe
- [ ] Bateria no carregador, protetor de tela desligado
- [ ] Testar o **projetor** com o cardápio aberto: tema escuro em projetor fraco some
- [ ] Reset da demo, se alguém mexeu nela: `node scripts/seed-demo.mjs`

### Rede de segurança

- [ ] **Vídeo gravado** do fluxo inteiro (3–4 min) salvo no computador — não no Drive
- [ ] **Prints** das 6 telas principais dentro dos slides
- [ ] Se a internet do campus cair: o vídeo é o plano A, não o improviso

---

## 2. Ordem da apresentação

**A ordem minuto a minuto e a fala de cada um estão em `docs/apresentacao-por-pessoa.md`.**
Cada um lê só a própria seção lá; este arquivo guarda o que é do grupo inteiro.

| Quando | Quem | O quê |
|---|---|---|
| 0:00 – 4:00 | Marcos | Abertura, problema, solução e a tela inicial ao vivo |
| 4:00 – 7:00 | Thiago | Painel: pedidos, caixa, desempenho, clientes |
| 7:00 – 11:30 | Gustavo | Cardápio, montagem do pedido e pagamento |
| 11:30 – 12:00 | Thiago | Volta ao painel: o pedido do Gustavo chegou |
| 12:00 – 15:00 | Thiago | Tecnologias e arquitetura |
| 15:00 – 17:00 | Marcos | Modelo de negócio, validação e encerramento |

Se o relógio apertar, **corte arquitetura, nunca a demonstração**. A banca lembra do
sistema funcionando, não do diagrama.

---

## 3. Detalhe de cada tela

> Esta seção é o detalhe de **o que clicar em cada tela**, não a ordem de execução —
> a ordem está na seção 2 e no arquivo por pessoa. Use aqui para conferir se não
> esqueceu nada da sua parte.

> Regra de ouro: **narre o que o lojista ganha, não o que a tela faz.**
> Ruim: "aqui tem um gráfico de faturamento".
> Bom: "ele abre no domingo à noite e sabe o que comprar na segunda."

### 3.1 — O cliente pede (2 min) · aba 1 + celular

1. Abra o cardápio da loja demo (`/loja/demo`) no celular, já aquecido.
2. Abra o **Smash Clássico**.
3. Mostre os **grupos de opção**: "Ponto da carne" é obrigatório, adicionais são
   pagos e recalculam o preço na hora.
   > "Isso é o que evita a ligação de volta perguntando o ponto da carne."
4. Adicione ao carrinho e vá até o checkout.
5. **Diga em voz alta:** *"o pedido não abre o WhatsApp — ele entra no sistema."*
   É a diferença entre isto e um gerador de link.

### 3.2 — O pedido chega (2 min) · aba 2

1. O pedido aparece no quadro em **Recebido**.
2. **Arraste** o card para "Em preparo" e depois "Pronto". O status muda de verdade,
   e o cliente acompanha pela página do pedido.
3. Mostre o quadro cheio: pedidos em cada coluna e um agendado para amanhã.

### 3.3 — A gestão (1,5 min) · abas 2 e 3

- **Caixa**: entradas do dia separadas por dinheiro, Pix e cartão, com exportação CSV.
- **Desempenho**: faturamento por dia da semana, top produtos, horário de pico.
  > "É uma loja de demonstração, com 35 dias de histórico gerado por script — por isso tem gráfico e não tela vazia."

### 3.4 — Realidade aumentada — **fora do escopo**

A realidade aumentada não entra nesta apresentação, e não há prato 3D publicado
na loja demo.

Se a banca perguntar, a resposta é curta: *"existe no plano Pro — o lojista manda até
quatro fotos do prato, a IA gera o modelo 3D e ele publica. Não faz parte do que a
gente escolheu mostrar hoje."* **Não abra o painel para procurar.**

---

## 4. Plano B

| Se acontecer | O que fazer |
|---|---|
| Internet do campus caiu | Abra o **vídeo gravado**. Narre por cima dele, mesmo roteiro. |
| Cardápio demorando a abrir | Não fique em silêncio: *"está subindo o servidor, enquanto isso…"* e fale do problema. Nunca recarregue duas vezes seguidas. |
| Pedem para ver o 3D | Está fora do escopo: diga que o recurso existe no plano Pro e siga. **Não abra o painel para procurar.** |
| Alguém zerou a demo | `node scripts/seed-demo.mjs` (precisa de internet e do terminal aberto). |
| Projetor lavou as cores | O cardápio tem botão de tema — troque para o claro. |
| Pedido de teste não aparece | Recarregue a aba do painel uma vez. Se não vier, siga pelo quadro que já tem pedidos. |

---

## 5. Perguntas prováveis da banca

**"Como vocês garantem que uma loja não vê o dado de outra?"**
Row Level Security no PostgreSQL. A política de acesso está no banco, por loja, e
vale para qualquer caminho de acesso. Não é um `WHERE` no código da aplicação, que
poderia ser esquecido numa consulta nova.

**"Por que não usar só um framework de frontend?"**
O cardápio precisa abrir rápido no celular do cliente final, muitas vezes em rede
ruim, e precisa ser achado no Google. Renderização no servidor entrega HTML pronto;
uma SPA entregaria tela em branco até o JavaScript baixar.

**"E se dois pedidos chegarem ao mesmo tempo?"**
A criação do pedido é uma função transacional no banco. O limite de pedidos do
plano é validado lá dentro, não no cliente — duas abas abertas não burlam.

**"E o estoque?"** (só se perguntarem)
Existe no sistema, mas escolhemos mostrar o fluxo do pedido do começo ao fim. O
estoque nunca bloqueia a venda: registra e avisa, e quem decide é o lojista.

**"Qual o modelo de negócio?"**
Assinatura mensal por loja — Lite R$ 29, Plus R$ 69, Pro R$ 149 — **sem comissão
por pedido**. A receita não cresce às custas da margem do restaurante.

**"Quem são os concorrentes?"**
Marketplaces (iFood, Rappi) cobram comissão e ficam com o cliente. Geradores de
cardápio em link levam o pedido para o WhatsApp e param aí. Aqui o pedido entra no
sistema e segue até caixa e relatório — é operação, não só vitrine.

**"É um protótipo ou está em uso?"**
Está em produção, com domínio próprio, pagamento e cobrança recorrente automatizada.

**"O que vocês fariam diferente?"**
Resposta honesta vale mais que defesa: o modelo 3D depender de um domínio externo
é uma fragilidade que já identificamos; o certo é servir o arquivo do próprio
projeto. Mostrar que se sabe onde o sistema está frágil impressiona mais que negar.

---

## 6. Divisão entre os apresentadores

O grupo são três: **Thiago** (full-stack, puxado para o back-end), **Gustavo**
(front-end) e **Marcos** (documentação). O Igor saiu do grupo: o banco passou para o
Thiago, e o estoque ficou fora da apresentação.

**O roteiro de fala de cada um está em `docs/apresentacao-por-pessoa.md`** — abra lá
e leia só a sua seção. O resumo:

| Quem | Apresenta | Responde na arguição |
|---|---|---|
| **Marcos** | Abertura, problema, solução, tela inicial, modelo de negócio e fecho | Escopo, metodologia, pesquisa, negócio, concorrência |
| **Thiago** | Painel do lojista, o pedido chegando, arquitetura e as três decisões | Arquitetura, integrações, pagamento, deploy, PWA, banco, RLS, transações, gatilhos e segurança |
| **Gustavo** | Cardápio, montagem do pedido e pagamento | Interface, responsividade, experiência, acessibilidade |

Quem apresentou um bloco **não** é obrigado a responder a pergunta dele: na arguição
responde quem domina o assunto. Pergunta de banco vai para o Thiago, mesmo que tenha
nascido da tela que o Gustavo mostrou.

Combinem um sinal para quando alguém travar — basta o colega assumir com
*"complementando…"*. Travar acontece; silêncio de dez segundos é que pesa.

**Ensaiem uma vez inteiro, com cronômetro, na véspera.** Uma vez só já corta metade
dos tropeços — principalmente a troca de quem fala, que é onde costuma travar.
