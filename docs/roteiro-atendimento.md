# Roteiro de atendimento — Cardápio Hub

Guia pra ligação/WhatsApp com o lead que preencheu o formulário da landing.
Objetivo: entender o negócio do cliente, mostrar valor e colocar a loja no ar **junto com ele**.

> O lead chega no painel **/admin/leads** com: nome, empresa, e-mail, WhatsApp, faturamento e segmento.
> Antes de ligar, dê uma olhada nesses dados — já dá pra personalizar a conversa.

---

## 1. Abertura (quebra-gelo)

> "Oi, [nome]! Aqui é o [seu nome] do Cardápio Hub. Você deixou seus dados no nosso site
> pedindo pra colocar seu cardápio no ar — tô te ligando pra te ajudar com isso, tudo bem?
> Só uns minutinhos."

- Tom leve, sem pressão. É ajuda, não venda agressiva.
- Confirme que é um bom momento. Se não for, agende: *"Qual melhor horário pra gente falar?"*

## 2. Perguntas de qualificação

Entenda o negócio antes de falar do produto:

1. **"Me conta um pouco do seu [segmento]** — vocês vendem mais no balcão, delivery, ou os dois?"
2. **"Como você anota os pedidos hoje?"** (bloquinho, WhatsApp, caderno, outro sistema?)
3. **"Você já tem cardápio digital ou link pra mandar pros clientes?"**
4. **"Quantos pedidos por dia/semana vocês fazem, mais ou menos?"** (ajuda a indicar Free vs Pro)
5. **"Tem alguém que cuida do celular/pedidos, ou é você mesmo?"**

> Anote as respostas no campo de **anotações do lead** no painel.

## 3. Explicando como funciona

Conecte com a dor que ele acabou de descrever:

- **"O Cardápio Hub é um cardápio digital com link próprio da sua loja.** Seu cliente abre no
  celular, monta o pedido, e ele cai direto num painel pra você — sem você anotar nada no bloquinho."
- **"Não tem taxa por pedido.** Diferente de iFood e afins, você não paga comissão por venda."
- **"Tem painel de pedidos, caixa e desempenho** — você vê quanto vendeu no dia, quais produtos saem mais."
- **"E o melhor: a gente monta o cardápio junto com você.** Você me passa os produtos e preços e
  eu já deixo tudo pronto — você só compartilha o link."

## 4. Planos (adeque ao faturamento)

- **Lite (R$ 29/mês):** até 30 produtos, 60 pedidos/mês, cor e logo, painel de pedidos e caixa.
  *"Pra colocar a loja no ar com o essencial e já começar a vender."*
- **Pro (sob medida — o padrão cadastrado é R$ 89/mês):** produtos e pedidos ilimitados, sua marca
  sem selo, CRM de clientes fiéis, relatórios, QR Code, exportação.
  *"Pra quem já vende bem e quer crescer sem limite."*

> **NÃO existe plano gratuito.** O Lite é pago desde o primeiro mês, cobrado antecipado.
> Nunca prometa "grátis" na ligação — o cliente recebe a cobrança e a relação começa torta.
> Se o volume for baixo, comece no Lite; a conta migra pro Pro depois.

> ⚠️ Ao mudar preço ou limite, atualize junto: `components/landing/LandingPricing.tsx`,
> `LandingFaq.tsx`, `lib/seo.ts`, `app/dashboard/ajuda/page.tsx` e o limite real na RPC
> `create_order` no Supabase. Este roteiro já ficou desatualizado uma vez e mandava
> oferecer plano grátis que não existe mais.

## 5. Fechamento / próximo passo

- **"Bora fazer o seguinte:** me manda por aqui uma foto do seu cardápio ou os produtos e preços,
  que eu já monto sua loja hoje e te mando pra você ver funcionando."
- **Deixe o pagamento claro antes de montar:** *"O Lite é R$ 29 por mês, e o primeiro mês é
  pago adiantado — assim que cair, seu cardápio vai ao ar e você já pode divulgar o link."*
  Não deixe a cobrança virar surpresa depois da loja pronta.
- Combine o próximo contato: *"Te chamo aqui no WhatsApp assim que estiver pronto, pode ser?"*
- Atualize o **status** do lead no painel:
  - **Contatado** — falou mas ainda não fechou
  - **Fechado** — topou, vai virar loja
  - **Perdido** — não tem interesse / não é o perfil

## 6. Depois da ligação (onboarding interno)

Quando o cliente topar:

1. Crie a loja dele em **/signup** (fluxo interno — o cliente não faz isso sozinho).
2. Monte o cardápio inicial com os produtos que ele passou.
3. Rode o **checklist de configuração** abaixo — item por item, sem pular.
4. Envie o link da loja + login pro cliente no WhatsApp.
5. Marque o lead como **Fechado** no painel.

> A loja nasce com a cobrança pendente e o cardápio suspenso. Pra montar antes do
> pagamento, ligue o **modo de montagem** em `/admin/lojas` (`setup_unlocked`). O cardápio
> público só abre quando o primeiro mês é pago.

### Checklist de configuração (antes de entregar)

Você preenche o cadastro no lugar do cliente, então **o erro de digitação é seu**. Confira:

- [ ] **WhatsApp da loja** — confira o número **abrindo o link** em `/dashboard/links`.
      Se o card do WhatsApp não aparecer, o número está inválido e o campo precisa ser refeito.
      *(já aconteceu de uma senha ser digitada nesse campo e a loja subir sem contato)*
- [ ] **Taxa e zonas de entrega** — **configure junto com o lojista, nunca por conta própria.**
      Sem zona cadastrada, toda entrega sai pela taxa padrão da loja; se ela estiver em R$ 0,
      ele entrega de graça pra cidade inteira sem perceber. Pergunte bairro por bairro.
- [ ] **Pedido mínimo** — confirme com ele; o padrão é R$ 0.
- [ ] **Horário de funcionamento** — se ligar o **modo automático**, preencha a grade da semana.
      Sem isso, a loja só fecha se ele fechar na mão e entra pedido de madrugada.
- [ ] **Formas de pagamento** — dinheiro/cartão/Pix conforme o que ele aceita de verdade.
      Se marcar Pix, a chave precisa estar preenchida.
- [ ] **Fazer um pedido de teste** no cardápio e conferir que caiu no painel — depois cancele.

---

## Objeções comuns

| Cliente diz | Você responde |
|---|---|
| *"Já uso o iFood."* | "Ótimo, dá pra usar os dois. A diferença é que aqui você não paga comissão por venda — o link é seu e o cliente pede direto." |
| *"Não tenho tempo pra montar isso."* | "Por isso eu monto pra você. Você só me passa os produtos." |
| *"É caro?"* | "O Lite sai R$ 29 por mês, sem comissão nenhuma por venda. Um pedido de delivery já paga o mês — no iFood você pagaria isso em taxa numa tarde." |
| *"Preciso pensar."* | "Claro! Faço o seguinte: monto sua loja com seus produtos e te mando pra você ver funcionando. Aí você decide com ela pronta na mão." *(monte com o modo de montagem ligado — o cardápio só vai ao ar quando ele pagar)* |
