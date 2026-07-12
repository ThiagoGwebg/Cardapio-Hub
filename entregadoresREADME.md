Criei a página para cadastro de entregadores seguindo o estilo visual e de código do projeto. Os novos cadastros são salvos na mesma base de dados e aparecem automaticamente no painel de administração com filtros e visualização próprios.

O resumo detalhado da arquitetura e das mudanças realizadas está disponível no artefato `courier_sign_up_implementation.md`.

### Resumo do que foi feito:

1. **Nova Rota Pública (`/entregadores`)**: Criada em `page.tsx`, contendo a explicação dos benefícios e a chamada para o formulário.
2. **Formulário de Cadastro**: Criado o componente `LandingCourierForm.tsx` que coleta nome, e-mail, WhatsApp, cidade/estado, tipo de veículo (moto, carro, bike, etc.), chave Pix e disponibilidade de horário.
3. **Server Action de Submissão**: Criado em `couriers.ts` para persistir o entregador como um lead (marcado com `segment: 'Entregador'`).
4. **Painel do Administrador**: Adaptado o componente `LeadsBoard.tsx` para diferenciar visualmente os entregadores (mostrando o ícone 🛵/🚲/🚗 correspondente ao veículo e ocultando a opção de criar uma loja comercial).
5. **Rodapé**: Adicionado o link para a nova página no `LandingFooter.tsx`.

---

### Decisões / Próximos Passos que necessitam da sua validação:

1. **Mapeamento na tabela `leads`**: Atualmente, as candidaturas dos entregadores estão sendo armazenadas na mesma tabela de `leads` com o campo `segment: 'Entregador'`. Isso foi feito para evitar migrações de banco e permitir que você veja os cadastros imediatamente no dashboard administrativo atual. Deseja que no futuro criemos uma tabela dedicada `couriers` se o fluxo crescer?
2. **Notificações**: Por padrão, a ação de cadastro dispara a função `notifyNewLead` existente (que atualmente apenas faz `console.log` no servidor). Se quiser plugar disparos reais de WhatsApp ou e-mail para o seu time de vendas quando um entregador se cadastrar, podemos configurar isso na `notify.ts`.

---

### Como acessar a parte de entregadores (Três formas):

#### 1. Pelo Rodapé da Página Principal (Landing Page)
Se você rolar a página inicial do site até o final (rodapé), verá um novo link chamado "Quero Entregar" ao lado de "Privacidade". Clicando nele, você será redirecionado para a página de cadastro.

#### 2. Acesso Direto pelo Navegador
Você pode acessar a página diretamente digitando o caminho `/entregadores` no seu navegador.
* **Em ambiente de desenvolvimento local:** `http://localhost:3000/entregadores`

#### 3. Visualização dos Entregadores Cadastrados (Área Administrativa)
Para ver os entregadores que se cadastraram:
1. Acesse o painel de administração em `/admin/leads` (ex: `http://localhost:3000/admin/leads`).
2. Os entregadores aparecerão misturados aos outros leads na coluna de "Novos", mas com um estilo diferente:
   * Eles exibem a tag **🛵 Entregador** e um chip com o tipo de veículo do candidato (Ex: 🚲 Bicicleta, 🛵 Moto).
   * A caixa de ações deles mostra "Cadastro de Entregador" em ciano em vez do botão de aprovação e criação de loja.