# Estoque, entrada de NF-e e ficha técnica

Painel → **Estoque** (`/dashboard/estoque`) e **Integrações** (`/dashboard/integracoes`).
Banco: `docs/migracao-estoque.sql` (só cria objetos novos).

## O que o lojista faz

| Aba | Para quê |
|---|---|
| Estoque geral | Insumos com saldo, mínimo, custo médio e valor em estoque. Movimentar: entrada sem nota, saída, perda ou **contagem** (informa quanto tem; a diferença vira ajuste). |
| Entrada NF-e | Importa o `.xml` da nota → revisa (liga cada item a um insumo, com conversão tipo 1 CX = 12 un) → **Lançar no estoque**. Na próxima nota do mesmo fornecedor, os itens já vêm ligados (`supplier_item_links`). |
| Movimentações | Livro-razão de tudo que entrou e saiu, com link para o pedido ou a nota de origem. |
| Fornecedores | Criados sozinhos pela nota (CNPJ) ou à mão. |
| Ficha técnica | Quanto de cada insumo sai por unidade vendida — do produto e de cada adicional. Mostra custo (CMV) e margem. |

## Regras do banco

- **Saldo só muda por movimentação.** `stock_movements` é imutável para o lojista (sem UPDATE/DELETE); o gatilho `apply_stock_movement` atualiza `stock_items.quantity` e, nas entradas com custo, o custo médio ponderado. O UPDATE direto de `quantity`/custos está revogado.
- **Baixa automática** (`sync_order_stock`, gatilho de constraint *adiado* em `orders`): quando o pedido está em `preparando`, `pronto`, `a_caminho` ou `concluido`, os insumos da ficha técnica saem como `venda`. Se o pedido for `cancelado` depois, volta tudo como `estorno`. É idempotente e roda no COMMIT — por isso enxerga os itens que `create_order`/`create_manual_order` inserem depois do pedido.
- Pedido sem ficha técnica não baixa nada. Estoque pode ficar negativo (o pedido nunca é bloqueado por falta de insumo).
- **Alerta de custo**: no lançamento, cada item guarda o custo médio anterior (`prev_cost_cents`). Variação ≥ 10% (`COST_ALERT_PCT`) aparece no topo do Estoque até o lojista marcar **Ciente**.

## Aplicar em produção

1. Revisar `docs/migracao-estoque.sql`.
2. Rodar no SQL Editor do projeto `cardapio-agil`.
3. Conferir os advisors de segurança do Supabase (RLS em todas as tabelas novas).

## Focus NFe (próximo passo)

Hoje o cartão em Integrações só guarda CNPJ/ambiente e marca a ativação como solicitada (`store_integrations.status = 'pending'`). Para ligar de verdade:

- Conta na Focus NFe e token da plataforma (`FOCUS_NFE_TOKEN`, só no servidor).
- Cadastrar a empresa da loja e o **certificado digital A1** na Focus.
- Rotina (cron da Vercel) que consulta as NF-e recebidas (manifestação do destinatário), baixa o XML e reaproveita o mesmo fluxo do upload — `parseNfeXml` + insert em `purchase_invoices` com `source = 'focus'`, que aparece como **Automático**.
