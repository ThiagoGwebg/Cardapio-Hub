-- ============================================================
-- Migração: ESTOQUE + ENTRADA DE NF-e + FICHA TÉCNICA + INTEGRAÇÕES
--
-- STATUS: APLICADA em produção (cardapio-agil / pafotbuwpvnpzxdlhzud) em
-- 2026-11-12, como a migração "estoque_nfe_ficha_tecnica_integracoes".
-- Só CRIA objetos novos — não altera nenhuma tabela existente. O único
-- ponto de contato com o fluxo atual é um gatilho novo em `orders`
-- (baixa automática), que só lê o pedido e escreve em stock_movements.
--
-- Modelo
--   stock_items           insumos (saldo, mínimo, custo médio)
--   stock_movements       livro-razão imutável; todo saldo nasce daqui
--   suppliers             fornecedores (criados à mão ou pela nota)
--   purchase_invoices     notas de entrada (XML hoje, Focus NFe depois)
--   purchase_invoice_items itens da nota, com o insumo mapeado
--   supplier_item_links   memória "código do fornecedor → insumo"
--   product_recipe_items  ficha técnica (por produto OU por adicional)
--   store_integrations    estado das integrações por loja
--
-- Quantidades em numeric(14,3) na unidade do insumo; custos em centavos
-- numeric(14,4) por unidade (R$ 0,0123/g é um custo real de cozinha).
-- ============================================================

-- ── Insumos ─────────────────────────────────────────────────
create table public.stock_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  unit text not null default 'un' check (unit in ('un','kg','g','l','ml','cx','pct')),
  quantity numeric(14,3) not null default 0,
  min_quantity numeric(14,3) not null default 0 check (min_quantity >= 0),
  avg_cost_cents numeric(14,4) not null default 0 check (avg_cost_cents >= 0),
  last_cost_cents numeric(14,4),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index stock_items_store_name_uidx on public.stock_items (store_id, lower(trim(name)));
create index stock_items_store_idx on public.stock_items (store_id, is_active);

-- ── Fornecedores ────────────────────────────────────────────
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  cnpj text check (cnpj is null or cnpj ~ '^[0-9]{14}$'),
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);
create unique index suppliers_store_cnpj_uidx on public.suppliers (store_id, cnpj) where cnpj is not null;
create index suppliers_store_idx on public.suppliers (store_id);

-- ── Notas de entrada ────────────────────────────────────────
create table public.purchase_invoices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  supplier_name text not null,
  supplier_cnpj text,
  access_key text check (access_key is null or access_key ~ '^[0-9]{44}$'),
  number text,
  series text,
  issued_at timestamptz,
  products_cents integer not null default 0,
  total_cents integer not null default 0,
  status text not null default 'pendente' check (status in ('pendente','lancada','descartada')),
  source text not null default 'xml' check (source in ('xml','focus')),
  launched_at timestamptz,
  launched_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index purchase_invoices_store_key_uidx on public.purchase_invoices (store_id, access_key) where access_key is not null;
create index purchase_invoices_store_idx on public.purchase_invoices (store_id, status, created_at desc);

create table public.purchase_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.purchase_invoices(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  line integer not null,
  code text,
  ean text,
  description text not null,
  unit text,
  quantity numeric(14,4) not null,
  unit_price_cents numeric(14,4) not null,
  total_cents integer not null,
  item_id uuid references public.stock_items(id) on delete set null,
  -- Quantas unidades DO INSUMO vêm em 1 unidade DA NOTA (ex.: 1 CX = 12 un).
  conversion numeric(14,4) not null default 1 check (conversion > 0),
  ignored boolean not null default false,
  -- Preenchidos no lançamento: custo médio do insumo ANTES desta nota, pra
  -- mostrar a variação de custo e o lojista marcar "Ciente".
  prev_cost_cents numeric(14,4),
  cost_alert_ack boolean not null default false
);
create index purchase_invoice_items_invoice_idx on public.purchase_invoice_items (invoice_id, line);
create index purchase_invoice_items_store_idx on public.purchase_invoice_items (store_id);

create table public.supplier_item_links (
  store_id uuid not null references public.stores(id) on delete cascade,
  supplier_cnpj text not null,
  code text not null,
  item_id uuid not null references public.stock_items(id) on delete cascade,
  conversion numeric(14,4) not null default 1 check (conversion > 0),
  updated_at timestamptz not null default now(),
  primary key (store_id, supplier_cnpj, code)
);

-- ── Movimentações (livro-razão) ─────────────────────────────
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  item_id uuid not null references public.stock_items(id) on delete cascade,
  kind text not null check (kind in ('entrada','saida','ajuste','perda','venda','estorno')),
  -- Com sinal: positivo entra, negativo sai.
  quantity numeric(14,3) not null check (quantity <> 0),
  unit_cost_cents numeric(14,4),
  note text,
  order_id uuid references public.orders(id) on delete set null,
  invoice_id uuid references public.purchase_invoices(id) on delete set null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index stock_movements_store_idx on public.stock_movements (store_id, created_at desc);
create index stock_movements_item_idx on public.stock_movements (item_id, created_at desc);
create index stock_movements_order_idx on public.stock_movements (order_id) where order_id is not null;

-- ── Ficha técnica ───────────────────────────────────────────
create table public.product_recipe_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  option_id uuid references public.product_options(id) on delete cascade,
  item_id uuid not null references public.stock_items(id) on delete cascade,
  quantity numeric(14,4) not null check (quantity > 0),
  created_at timestamptz not null default now(),
  check ((product_id is null) <> (option_id is null))
);
create unique index product_recipe_items_product_uidx on public.product_recipe_items (product_id, item_id) where product_id is not null;
create unique index product_recipe_items_option_uidx on public.product_recipe_items (option_id, item_id) where option_id is not null;
create index product_recipe_items_store_idx on public.product_recipe_items (store_id);

-- ── Integrações ─────────────────────────────────────────────
create table public.store_integrations (
  store_id uuid not null references public.stores(id) on delete cascade,
  provider text not null check (provider in ('focus_nfe')),
  status text not null default 'disconnected' check (status in ('disconnected','pending','connected')),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (store_id, provider)
);

-- ── updated_at ──────────────────────────────────────────────
create trigger stock_items_set_updated_at before update on public.stock_items
  for each row execute function public.set_updated_at();
create trigger store_integrations_set_updated_at before update on public.store_integrations
  for each row execute function public.set_updated_at();

-- ── Saldo e custo médio nascem da movimentação ──────────────
create or replace function public.apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_item stock_items%rowtype;
  v_base numeric;
begin
  select * into v_item from stock_items where id = new.item_id for update;
  if not found or v_item.store_id <> new.store_id then
    raise exception 'Insumo não pertence a esta loja';
  end if;

  -- Entrada com custo: média ponderada sobre o saldo positivo (saldo negativo
  -- não "dilui" o custo novo).
  if new.kind = 'entrada' and new.quantity > 0 and new.unit_cost_cents is not null then
    v_base := greatest(v_item.quantity, 0);
    update stock_items set
      avg_cost_cents = case
        when v_base + new.quantity > 0
          then round((v_base * v_item.avg_cost_cents + new.quantity * new.unit_cost_cents) / (v_base + new.quantity), 4)
        else new.unit_cost_cents end,
      last_cost_cents = new.unit_cost_cents,
      quantity = quantity + new.quantity
    where id = new.item_id;
  else
    update stock_items set quantity = quantity + new.quantity where id = new.item_id;
  end if;
  return new;
end;
$$;
revoke execute on function public.apply_stock_movement() from public, anon, authenticated;

create trigger stock_movements_apply after insert on public.stock_movements
  for each row execute function public.apply_stock_movement();

-- ── Baixa automática pela ficha técnica ─────────────────────
-- Estados em que o pedido já consumiu os insumos.
create or replace function public.stock_consuming_status(p order_status)
returns boolean language sql immutable set search_path to ''
as $$ select p in ('preparando','pronto','a_caminho','concluido') $$;

-- Reconcilia o estoque com o estado ATUAL do pedido. Idempotente: pode
-- rodar várias vezes pro mesmo pedido sem baixar em dobro.
create or replace function public.sync_order_stock()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_order orders%rowtype;
  v_outstanding boolean;
  v_label text;
begin
  -- Gatilho adiado (roda no COMMIT): relê o pedido, porque o create_order /
  -- create_manual_order insere os itens DEPOIS do pedido, na mesma transação.
  select * into v_order from orders where id = new.id;
  if not found then return null; end if;

  -- "Baixa em aberto": algum insumo com venda ainda não estornada. Olhar o
  -- saldo líquido (venda + estorno) em vez de "já teve venda?" permite
  -- cancelar e reativar quantas vezes for, sempre consistente.
  select exists (
    select 1 from stock_movements
    where order_id = v_order.id and kind in ('venda', 'estorno')
    group by item_id
    having sum(quantity) < 0
  ) into v_outstanding;

  v_label := 'Pedido nº ' || coalesce(v_order.order_number::text, left(v_order.id::text, 8));

  if public.stock_consuming_status(v_order.status) and not v_outstanding then
    insert into stock_movements (store_id, item_id, kind, quantity, order_id, note, created_by)
    select v_order.store_id, c.item_id, 'venda', -sum(c.qty), v_order.id, v_label, null
    from (
      -- insumos do produto
      select r.item_id, r.quantity * oi.quantity as qty
      from order_items oi
      join product_recipe_items r on r.product_id = oi.product_id
      where oi.order_id = v_order.id
      union all
      -- insumos dos adicionais escolhidos
      select r.item_id, r.quantity * oi.quantity
      from order_items oi
      join order_item_options io on io.order_item_id = oi.id
      join product_recipe_items r on r.option_id = io.option_id
      where oi.order_id = v_order.id
    ) c
    join stock_items si on si.id = c.item_id and si.store_id = v_order.store_id
    group by c.item_id
    having sum(c.qty) > 0;

  elsif v_order.status = 'cancelado' and v_outstanding then
    -- Devolve exatamente o que está em aberto, insumo a insumo.
    insert into stock_movements (store_id, item_id, kind, quantity, order_id, note, created_by)
    select v_order.store_id, item_id, 'estorno', -sum(quantity), v_order.id, v_label || ' cancelado', null
    from stock_movements
    where order_id = v_order.id and kind in ('venda', 'estorno')
    group by item_id
    having sum(quantity) < 0;
  end if;

  return null;
end;
$$;
revoke execute on function public.sync_order_stock() from public, anon, authenticated;

create constraint trigger orders_sync_stock
  after insert or update on public.orders
  deferrable initially deferred
  for each row execute function public.sync_order_stock();

-- ── Lançar uma nota no estoque (tudo ou nada) ───────────────
create or replace function public.launch_purchase_invoice(p_invoice_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_inv purchase_invoices%rowtype;
  v_line purchase_invoice_items%rowtype;
  v_item stock_items%rowtype;
  v_qty numeric;
  v_cost numeric;
  v_count integer := 0;
begin
  select * into v_inv from purchase_invoices where id = p_invoice_id for update;
  if not found or not exists (select 1 from stores s where s.id = v_inv.store_id and s.owner_id = auth.uid()) then
    raise exception 'Nota não encontrada';
  end if;
  if v_inv.status <> 'pendente' then raise exception 'Esta nota já foi lançada ou descartada'; end if;

  if exists (select 1 from purchase_invoice_items where invoice_id = v_inv.id and not ignored and item_id is null) then
    raise exception 'Escolha o insumo de todos os itens (ou marque para ignorar)';
  end if;

  for v_line in select * from purchase_invoice_items where invoice_id = v_inv.id and not ignored order by line
  loop
    select * into v_item from stock_items where id = v_line.item_id and store_id = v_inv.store_id;
    if not found then raise exception 'Insumo inválido na linha %', v_line.line; end if;

    v_qty := round(v_line.quantity * v_line.conversion, 3);
    v_cost := round(v_line.unit_price_cents / v_line.conversion, 4);

    update purchase_invoice_items set prev_cost_cents = v_item.avg_cost_cents where id = v_line.id;

    insert into stock_movements (store_id, item_id, kind, quantity, unit_cost_cents, invoice_id, note)
    values (v_inv.store_id, v_line.item_id, 'entrada', v_qty, v_cost, v_inv.id,
            'NF ' || coalesce(v_inv.number, '') || ' — ' || v_inv.supplier_name);

    if v_inv.supplier_cnpj is not null and v_line.code is not null then
      insert into supplier_item_links (store_id, supplier_cnpj, code, item_id, conversion)
      values (v_inv.store_id, v_inv.supplier_cnpj, v_line.code, v_line.item_id, v_line.conversion)
      on conflict (store_id, supplier_cnpj, code)
      do update set item_id = excluded.item_id, conversion = excluded.conversion, updated_at = now();
    end if;
    v_count := v_count + 1;
  end loop;

  update purchase_invoices set status = 'lancada', launched_at = now(), launched_by = auth.uid()
  where id = v_inv.id;
  return v_count;
end;
$$;
revoke execute on function public.launch_purchase_invoice(uuid) from public, anon;

-- ── RLS: tudo é do dono da loja ─────────────────────────────
alter table public.stock_items enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchase_invoices enable row level security;
alter table public.purchase_invoice_items enable row level security;
alter table public.supplier_item_links enable row level security;
alter table public.stock_movements enable row level security;
alter table public.product_recipe_items enable row level security;
alter table public.store_integrations enable row level security;

create policy stock_items_own on public.stock_items for all to authenticated
  using (store_id in (select id from stores where owner_id = (select auth.uid())))
  with check (store_id in (select id from stores where owner_id = (select auth.uid())));
create policy suppliers_own on public.suppliers for all to authenticated
  using (store_id in (select id from stores where owner_id = (select auth.uid())))
  with check (store_id in (select id from stores where owner_id = (select auth.uid())));
create policy purchase_invoices_own on public.purchase_invoices for all to authenticated
  using (store_id in (select id from stores where owner_id = (select auth.uid())))
  with check (store_id in (select id from stores where owner_id = (select auth.uid())));
create policy purchase_invoice_items_own on public.purchase_invoice_items for all to authenticated
  using (store_id in (select id from stores where owner_id = (select auth.uid())))
  with check (store_id in (select id from stores where owner_id = (select auth.uid())));
create policy supplier_item_links_own on public.supplier_item_links for all to authenticated
  using (store_id in (select id from stores where owner_id = (select auth.uid())))
  with check (store_id in (select id from stores where owner_id = (select auth.uid())));
create policy product_recipe_items_own on public.product_recipe_items for all to authenticated
  using (store_id in (select id from stores where owner_id = (select auth.uid())))
  with check (store_id in (select id from stores where owner_id = (select auth.uid())));
create policy store_integrations_own on public.store_integrations for all to authenticated
  using (store_id in (select id from stores where owner_id = (select auth.uid())))
  with check (store_id in (select id from stores where owner_id = (select auth.uid())));

-- Movimentação é livro-razão: o dono lê e lança; ninguém edita nem apaga.
-- Corrigir é lançar um ajuste.
create policy stock_movements_select_own on public.stock_movements for select to authenticated
  using (store_id in (select id from stores where owner_id = (select auth.uid())));
create policy stock_movements_insert_own on public.stock_movements for insert to authenticated
  with check (
    store_id in (select id from stores where owner_id = (select auth.uid()))
    and kind in ('entrada','saida','ajuste','perda')
    and order_id is null
  );
revoke update, delete, truncate on public.stock_movements from anon, authenticated;

-- O saldo e o custo só mudam por movimentação (o gatilho acima, que é
-- security definer). Revogar só as colunas não basta — o UPDATE da tabela
-- inteira venceria —, então tira o UPDATE e devolve as colunas editáveis.
revoke update on public.stock_items from anon, authenticated;
grant update (name, unit, min_quantity, is_active) on public.stock_items to authenticated;
