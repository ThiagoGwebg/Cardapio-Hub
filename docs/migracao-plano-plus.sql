-- ============================================================
-- Migração: terceiro plano (Plus) + reajuste do Pro
--
-- STATUS: APLICADO em produção (projeto cardapio-agil / pafotbuwpvnpzxdlhzud).
-- Arquivo mantido como registro do que rodou e do que foi deixado de fora
-- de propósito.
--
-- Descoberto na inspeção: `subscriptions.plan` NÃO era text com CHECK — é o
-- enum `plan_tier`. Por isso o caminho abaixo é o de ALTER TYPE.
-- ============================================================


-- ------------------------------------------------------------
-- [APLICADO] Migração 1 — add_plus_to_plan_tier
--
-- Vai sozinha: o Postgres proíbe usar um valor de enum na mesma transação em
-- que ele foi criado, e a migração 2 referencia 'plus'.
-- ------------------------------------------------------------
alter type public.plan_tier add value if not exists 'plus' after 'free';

-- Resultado: free (1) · plus (1.5) · pro (2)


-- ------------------------------------------------------------
-- [APLICADO] Migração 2 — price_for_plan_add_plus_and_raise_pro
--
-- IMMUTABLE e `search_path = ''` preservados da definição anterior — o
-- search_path vazio é o que mantém a função fora do lint de segurança.
--
-- Definição anterior, para referência:
--   select case when p = 'pro' then 8900 else 2900 end;
-- ------------------------------------------------------------
create or replace function public.price_for_plan(p plan_tier)
returns integer
language sql
immutable
set search_path to ''
as $function$
  select case
    when p = 'pro'  then 14900
    when p = 'plus' then 6900
    else 2900
  end;
$function$;

-- Verificado: free -> 2900 · plus -> 6900 · pro -> 14900


-- ------------------------------------------------------------
-- NÃO APLICADO — reajuste da base existente
--
-- No momento da migração havia 4 lojas Lite (R$ 29) e 3 lojas Pro (R$ 89).
--
-- O trigger `subscriptions_sync_price_to_plan` é BEFORE UPDATE **OF plan**:
-- ele só recalcula price_cents quando o plano muda. Logo as 3 lojas Pro
-- continuam em 8900 — grandfathering, proposital.
--
-- Rodar o update abaixo reajusta cliente ativo de R$ 89 para R$ 149 (+67%)
-- sem aviso prévio. É decisão comercial, não passo de migração.
-- ------------------------------------------------------------
-- select store_id, plan, price_cents from subscriptions
-- where plan = 'pro' and price_cents = 8900;

-- update subscriptions set price_cents = 14900
-- where plan = 'pro' and price_cents = 8900;


-- ------------------------------------------------------------
-- NÃO APLICADO — faturas já emitidas
--
-- plan_invoices.amount_cents é congelado na emissão: fatura em aberto mantém
-- o valor antigo mesmo depois de um reajuste. Mexer nisso muda o valor de uma
-- cobrança que o lojista já recebeu por e-mail. O normal é deixar a atual
-- fechar no valor velho e só a próxima sair no novo.
-- ------------------------------------------------------------
-- select id, store_id, competence, amount_cents, status
-- from plan_invoices where status in ('open', 'overdue');


-- ------------------------------------------------------------
-- Consultas de conferência
-- ------------------------------------------------------------
-- Enum e preços:
-- select v::text as plano, public.price_for_plan(v) as centavos
-- from unnest(enum_range(null::plan_tier)) v;

-- Distribuição da base:
-- select plan, status, count(*), min(price_cents), max(price_cents)
-- from subscriptions group by plan, status order by plan;
