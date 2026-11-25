-- ============================================================
-- Migração: FECHA A LEITURA PÚBLICA DA TABELA `stores`
--
-- STATUS
--   FASE 1: APLICADA em produção (cardapio-agil / pafotbuwpvnpzxdlhzud) em
--     2026-11-16, como a migração "fecha_leitura_publica_stores_fase1_funcao"
--     (versão 20261117013342). Verificada com o papel `anon`: devolve uma
--     linha para slug real, zero para slug inexistente, e mascara a pix_key
--     de loja que recebe pelo Mercado Pago.
--   FASE 2: PENDENTE — rodar SÓ depois do deploy que usa get_store_public.
--     Até a fase 2 rodar, o vazamento CONTINUA ABERTO: a view e a política
--     antigas seguem valendo, e é isso que mantém o site no ar enquanto o
--     deploy não sai.
--
-- O problema
--   Hoje qualquer pessoa lê a tabela de lojas INTEIRA, de duas formas:
--
--   1. `stores_public_read ... for select to anon using (true)` — com a
--      NEXT_PUBLIC_SUPABASE_ANON_KEY (que está no bundle do navegador),
--      um GET /rest/v1/stores?select=* devolve todas as lojas, com
--      `pix_key`, `whatsapp_number`, `address` e `owner_id`.
--
--   2. A view `store_public` foi criada SEM `security_invoker`, então ela
--      roda com os privilégios do dono e IGNORA a RLS — e tem `grant
--      select` para `anon` E `authenticated`. Ou seja: além do visitante
--      anônimo, qualquer LOJISTA LOGADO baixa a lista completa dos
--      concorrentes, com a chave Pix de cada um.
--
--   `pix_key` é o pior campo da lista: quando o lojista cadastra a chave
--   do tipo CPF/CNPJ, é um dado de pessoa física saindo em lote.
--
-- A correção
--   O cardápio público precisa de UMA loja, buscada pelo slug — nunca da
--   lista. Então a leitura passa a ser uma função `security definer` que
--   recebe o slug e devolve no máximo uma linha, e os dois caminhos de
--   leitura ampla são fechados.
--
--   De bônus, a função só devolve `pix_key`/`pix_key_type` quando a loja
--   realmente usa Pix manual (`accepts_pix` e sem Mercado Pago online) —
--   exatamente a condição em que o cardápio mostra a chave na tela
--   (app/loja/[slug]/PublicMenu.jsx:1036). Loja que recebe pelo Mercado
--   Pago nunca mais expõe a chave estática, nem para o próprio visitante.
--
-- Por que em duas fases
--   A FASE 1 só ADICIONA a função: o código em produção continua lendo a
--   view e nada quebra. Depois do deploy que troca os call sites, a
--   FASE 2 fecha a leitura ampla. Rodar tudo de uma vez tiraria o
--   cardápio de todas as lojas do ar até o deploy terminar.
--
-- Não mexe em
--   `get_order` continua devolvendo `pix_key` da loja do pedido — ali é
--   uma linha por pedido e o cliente precisa da chave para pagar.
--   `stores_select_own` (dono lê a própria loja) e as leituras com
--   service_role (admin, sitemap, cobrança) seguem iguais.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- FASE 1 — JÁ APLICADA em 2026-11-16 (não quebra o código no ar)
-- Mantida aqui como registro; é idempotente (create or replace).
-- ════════════════════════════════════════════════════════════

-- Uma loja pelo slug, para o cardápio público e para o <head>/ícones/OG.
-- `security definer` porque depois da FASE 2 nem `anon` nem
-- `authenticated` enxergam mais a tabela — quem decide o que é público é
-- esta função, e ela devolve no máximo uma linha.
create or replace function public.get_store_public(p_slug text)
returns table (
  id uuid,
  slug text,
  name text,
  whatsapp_number text,
  address text,
  min_order_cents integer,
  is_open boolean,
  theme jsonb,
  delivery_enabled boolean,
  pickup_enabled boolean,
  dine_in_enabled boolean,
  delivery_fee_cents integer,
  estimated_prep_min integer,
  estimated_delivery_min integer,
  accepts_cash boolean,
  accepts_card boolean,
  accepts_pix boolean,
  pix_key text,
  pix_key_type public.pix_key_type,
  opening_hours jsonb,
  auto_hours boolean,
  checkout_mode public.checkout_mode,
  online_payment_enabled boolean,
  mp_connected boolean,
  billing_suspended boolean
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    s.id,
    s.slug,
    s.name,
    s.whatsapp_number,
    s.address,
    s.min_order_cents,
    s.is_open,
    s.theme,
    s.delivery_enabled,
    s.pickup_enabled,
    s.dine_in_enabled,
    s.delivery_fee_cents,
    s.estimated_prep_min,
    s.estimated_delivery_min,
    s.accepts_cash,
    s.accepts_card,
    s.accepts_pix,
    -- A chave estática só sai quando é ela que o cliente vai usar.
    case
      when s.accepts_pix and not (s.online_payment_enabled and s.mp_connected)
      then s.pix_key
    end,
    case
      when s.accepts_pix and not (s.online_payment_enabled and s.mp_connected)
      then s.pix_key_type
    end,
    s.opening_hours,
    s.auto_hours,
    s.checkout_mode,
    s.online_payment_enabled,
    s.mp_connected,
    -- O cardápio precisa saber para mostrar "loja indisponível".
    s.billing_suspended
  from public.stores s
  where s.slug = p_slug
  limit 1
$$;

comment on function public.get_store_public(text) is
  'Dados públicos de UMA loja, pelo slug. Único caminho de leitura de `stores` para anon/authenticated — não existe versão que liste todas. pix_key sai só quando a loja usa Pix manual.';

-- Sem o revoke, o `grant` default para PUBLIC deixaria a função aberta a
-- qualquer papel novo que apareça no projeto.
revoke execute on function public.get_store_public(text) from public;
grant execute on function public.get_store_public(text) to anon, authenticated, service_role;


-- ════════════════════════════════════════════════════════════
-- FASE 2 — rodar SÓ DEPOIS do deploy que usa get_store_public
--
-- Antes de rodar, confira que o cardápio público já está lendo pela
-- função: abra /loja/<slug> em produção e veja se carrega. Se carregar,
-- é a função respondendo (o deploy não lê mais a view).
-- ════════════════════════════════════════════════════════════

-- 1. Fecha a leitura da tabela base para o visitante anônimo.
--    `stores_select_own` continua: o dono lê a própria loja.
drop policy if exists stores_public_read on public.stores;

-- 2. Fecha a view, que é o furo mais largo (ignora RLS e estava liberada
--    para anon E authenticated). Fica existindo só para service_role,
--    que é quem o admin, o sitemap e a cobrança usam.
revoke select on public.store_public from anon, authenticated;

-- 3. Defesa em profundidade: se algum dia alguém devolver o `grant` por
--    engano, a view passa a respeitar a RLS da tabela e cada um vê
--    apenas a própria loja, em vez de todas.
alter view public.store_public set (security_invoker = on);

comment on view public.store_public is
  'USO INTERNO (service_role). O caminho público é a função get_store_public(slug). Não devolver `grant select` para anon/authenticated: a view não filtra por loja e expõe a chave Pix de todas.';


-- ════════════════════════════════════════════════════════════
-- CONFERÊNCIA — rodar depois da FASE 2
-- ════════════════════════════════════════════════════════════
-- Esperado: nenhuma linha (nem política de leitura ampla, nem grant).
--
--   select polname,
--          (select string_agg(r.rolname, ',') from pg_roles r
--            where r.oid = any(pol.polroles)) as papeis
--     from pg_policy pol join pg_class c on c.oid = pol.polrelid
--    where c.relname = 'stores' and pol.polcmd = 'r'
--      and pg_get_expr(pol.polqual, pol.polrelid) = 'true';
--
--   select grantee, privilege_type
--     from information_schema.role_table_grants
--    where table_schema = 'public' and table_name = 'store_public'
--      and grantee in ('anon', 'authenticated');
--
-- E o teste que importa, com a chave anônima (deve dar 401/permission
-- denied nos dois, e 200 com UMA loja no terceiro):
--
--   curl "$URL/rest/v1/stores?select=*"        -H "apikey: $ANON"
--   curl "$URL/rest/v1/store_public?select=*"  -H "apikey: $ANON"
--   curl -X POST "$URL/rest/v1/rpc/get_store_public" -H "apikey: $ANON" \
--        -H 'Content-Type: application/json' -d '{"p_slug":"<slug-real>"}'
-- ============================================================
