-- ============================================================
-- Estrutura base do Cardápio Hub para um Supabase de DESENVOLVIMENTO
--
-- Gerado em 2026-11-12 a partir dos catálogos do projeto de produção
-- (cardapio-agil), lendo só a ESTRUTURA — nenhum dado foi copiado.
--
-- Diferenças em relação à produção (de propósito):
--   * notify_new_order_push é uma função vazia: em produção ela chama
--     /api/push/send com um segredo; aqui um pedido de teste não pode
--     disparar notificação real.
--   * Sem pg_net (só a função de push usava).
--
-- Como aplicar: SQL Editor do projeto de TESTES > colar tudo > Run.
-- Banco vazio. Se já houver restos de uma tentativa anterior (erro
-- "already exists"), rode antes o 00-limpar-banco-de-testes.sql.
-- ============================================================

-- ── Tipos ───────────────────────────────────────────────────
create type public.order_status as enum ('agendado', 'novo', 'preparando', 'pronto', 'a_caminho', 'concluido', 'cancelado');
create type public.plan_tier as enum ('free', 'plus', 'pro');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete');
create type public.order_type as enum ('delivery', 'pickup', 'dine_in');
create type public.payment_method as enum ('cash', 'card', 'pix', 'card_online');
create type public.coupon_kind as enum ('percent', 'fixed', 'free_shipping');
create type public.checkout_mode as enum ('whatsapp', 'system');
create type public.pix_key_type as enum ('cpf_cnpj', 'email', 'phone', 'random');
create type public.payment_status as enum ('not_required', 'pending', 'paid', 'failed', 'expired', 'refunded');

-- ── Tabelas ─────────────────────────────────────────────────
create table public.stores (
  id uuid default gen_random_uuid() not null,
  owner_id uuid not null,
  slug text not null,
  name text not null,
  whatsapp_number text,
  address text,
  min_order_cents integer default 0 not null,
  is_open boolean default true not null,
  theme jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  delivery_enabled boolean default true not null,
  pickup_enabled boolean default true not null,
  dine_in_enabled boolean default false not null,
  delivery_fee_cents integer default 0 not null,
  estimated_prep_min integer default 30 not null,
  estimated_delivery_min integer default 45 not null,
  accepts_cash boolean default true not null,
  accepts_card boolean default true not null,
  accepts_pix boolean default false not null,
  pix_key text,
  opening_hours jsonb default '{}'::jsonb not null,
  auto_hours boolean default false not null,
  checkout_mode checkout_mode default 'whatsapp'::checkout_mode not null,
  pix_key_type pix_key_type,
  online_payment_enabled boolean default false not null,
  mp_connected boolean default false not null,
  billing_suspended boolean default false not null
);

create table public.categories (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  name text not null,
  emoji text,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now() not null
);

create table public.products (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  category_id uuid,
  name text not null,
  description text,
  price_cents integer not null,
  image_url text,
  is_active boolean default true not null,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  images jsonb default '[]'::jsonb not null,
  ar_model_url text,
  ar_size_cm numeric
);

create table public.ar_generations (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  product_id uuid not null,
  task_id text,
  status text default 'processing'::text not null,
  model_url text,
  preview_url text,
  size_cm numeric,
  source_photos jsonb default '[]'::jsonb not null,
  error text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.coupons (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  code text not null,
  kind coupon_kind default 'percent'::coupon_kind not null,
  value integer default 0 not null,
  min_order_cents integer default 0 not null,
  max_uses integer,
  uses integer default 0 not null,
  is_active boolean default true not null,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

create table public.delivery_zones (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  neighborhood text not null,
  fee_cents integer default 0 not null,
  min_order_cents integer default 0 not null,
  is_active boolean default true not null,
  sort_order integer default 0 not null
);

create table public.leads (
  id uuid default gen_random_uuid() not null,
  name text not null,
  company text,
  email text not null,
  whatsapp text,
  monthly_revenue text,
  segment text,
  created_at timestamp with time zone default now() not null,
  status text default 'novo'::text not null,
  notes text,
  updated_at timestamp with time zone default now() not null,
  converted_at timestamp with time zone,
  converted_user_id uuid,
  converted_store_id uuid
);

create table public.orders (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  status order_status default 'novo'::order_status not null,
  customer_name text not null,
  customer_phone text,
  customer_note text,
  subtotal_cents integer not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  order_type order_type default 'delivery'::order_type not null,
  payment_method payment_method,
  change_for_cents integer,
  delivery_fee_cents integer default 0 not null,
  discount_cents integer default 0 not null,
  total_cents integer default 0 not null,
  coupon_code text,
  table_number text,
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_reference text,
  address_cep text,
  order_number integer,
  source text default 'cardapio'::text not null,
  scheduled_for timestamp with time zone,
  payment_status payment_status default 'not_required'::payment_status not null,
  payment_provider text,
  paid_at timestamp with time zone
);

create table public.order_items (
  id uuid default gen_random_uuid() not null,
  order_id uuid not null,
  product_id uuid,
  product_name_snapshot text not null,
  unit_price_cents integer not null,
  quantity integer not null
);

create table public.order_item_options (
  id uuid default gen_random_uuid() not null,
  order_item_id uuid not null,
  option_id uuid,
  group_name_snapshot text default ''::text not null,
  name_snapshot text not null,
  price_delta_cents_snapshot integer default 0 not null
);

create table public.order_payments (
  id uuid default gen_random_uuid() not null,
  order_id uuid not null,
  store_id uuid not null,
  provider text default 'mercadopago'::text not null,
  provider_payment_id text,
  method text default 'pix'::text not null,
  amount_cents integer not null,
  status text default 'pending'::text not null,
  qr_code text,
  qr_code_base64 text,
  ticket_url text,
  expires_at timestamp with time zone,
  raw jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.order_status_history (
  id uuid default gen_random_uuid() not null,
  order_id uuid not null,
  store_id uuid not null,
  status order_status not null,
  changed_at timestamp with time zone default now() not null
);

create table public.plan_invoices (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  competence date not null,
  amount_cents integer not null,
  due_date date not null,
  status text default 'open'::text not null,
  provider text default 'mercadopago'::text not null,
  provider_payment_id text,
  qr_code text,
  qr_code_base64 text,
  ticket_url text,
  expires_at timestamp with time zone,
  paid_at timestamp with time zone,
  raw jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  notified_open_at timestamp with time zone,
  notified_overdue_at timestamp with time zone,
  notified_final_at timestamp with time zone,
  payment_claimed_at timestamp with time zone
);

create table public.plan_upgrade_requests (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  requested_by uuid,
  from_plan plan_tier default 'free'::plan_tier not null,
  to_plan plan_tier default 'pro'::plan_tier not null,
  status text default 'pending'::text not null,
  contact_phone text,
  note text,
  created_at timestamp with time zone default now() not null,
  resolved_at timestamp with time zone
);

create table public.platform_settings (
  key text not null,
  value text,
  updated_at timestamp with time zone default now() not null
);

create table public.product_option_groups (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  product_id uuid not null,
  name text not null,
  min_select integer default 0 not null,
  max_select integer default 1 not null,
  required boolean default false not null,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now() not null
);

create table public.product_options (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  group_id uuid not null,
  name text not null,
  price_delta_cents integer default 0 not null,
  is_active boolean default true not null,
  sort_order integer default 0 not null,
  image_url text,
  description text
);

create table public.push_subscriptions (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  endpoint text not null,
  subscription jsonb not null,
  created_at timestamp with time zone default now() not null
);

create table public.store_payment_credentials (
  store_id uuid not null,
  provider text default 'mercadopago'::text not null,
  mp_user_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamp with time zone,
  public_key text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.subscriptions (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  plan plan_tier default 'free'::plan_tier not null,
  status subscription_status default 'active'::subscription_status not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  billing_enabled boolean default false not null,
  billing_status text default 'current'::text not null,
  price_cents integer default 2900 not null,
  next_due_date date,
  grace_days smallint default 7 not null,
  suspended_at timestamp with time zone,
  setup_unlocked boolean default false not null
);

-- ── Chaves e restrições ─────────────────────────────────────
alter table public.ar_generations add constraint ar_generations_pkey PRIMARY KEY (id);
alter table public.categories add constraint categories_pkey PRIMARY KEY (id);
alter table public.coupons add constraint coupons_pkey PRIMARY KEY (id);
alter table public.delivery_zones add constraint delivery_zones_pkey PRIMARY KEY (id);
alter table public.leads add constraint leads_pkey PRIMARY KEY (id);
alter table public.order_item_options add constraint order_item_options_pkey PRIMARY KEY (id);
alter table public.order_items add constraint order_items_pkey PRIMARY KEY (id);
alter table public.order_payments add constraint order_payments_pkey PRIMARY KEY (id);
alter table public.order_status_history add constraint order_status_history_pkey PRIMARY KEY (id);
alter table public.orders add constraint orders_pkey PRIMARY KEY (id);
alter table public.plan_invoices add constraint plan_invoices_pkey PRIMARY KEY (id);
alter table public.plan_upgrade_requests add constraint plan_upgrade_requests_pkey PRIMARY KEY (id);
alter table public.platform_settings add constraint platform_settings_pkey PRIMARY KEY (key);
alter table public.product_option_groups add constraint product_option_groups_pkey PRIMARY KEY (id);
alter table public.product_options add constraint product_options_pkey PRIMARY KEY (id);
alter table public.products add constraint products_pkey PRIMARY KEY (id);
alter table public.push_subscriptions add constraint push_subscriptions_pkey PRIMARY KEY (id);
alter table public.store_payment_credentials add constraint store_payment_credentials_pkey PRIMARY KEY (store_id);
alter table public.stores add constraint stores_pkey PRIMARY KEY (id);
alter table public.subscriptions add constraint subscriptions_pkey PRIMARY KEY (id);
alter table public.coupons add constraint coupons_store_id_code_key UNIQUE (store_id, code);
alter table public.plan_invoices add constraint plan_invoices_provider_payment_id_key UNIQUE (provider_payment_id);
alter table public.plan_invoices add constraint plan_invoices_store_id_competence_key UNIQUE (store_id, competence);
alter table public.push_subscriptions add constraint push_subscriptions_endpoint_key UNIQUE (endpoint);
alter table public.stores add constraint stores_slug_key UNIQUE (slug);
alter table public.subscriptions add constraint subscriptions_store_id_key UNIQUE (store_id);
alter table public.subscriptions add constraint subscriptions_stripe_customer_id_key UNIQUE (stripe_customer_id);
alter table public.subscriptions add constraint subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);
alter table public.ar_generations add constraint ar_generations_status_check CHECK ((status = ANY (ARRAY['processing'::text, 'ready'::text, 'published'::text, 'discarded'::text, 'failed'::text])));
alter table public.leads add constraint leads_status_check CHECK ((status = ANY (ARRAY['novo'::text, 'contatado'::text, 'fechado'::text, 'perdido'::text])));
alter table public.order_items add constraint order_items_quantity_check CHECK ((quantity > 0));
alter table public.orders add constraint orders_source_check CHECK ((source = ANY (ARRAY['cardapio'::text, 'manual'::text])));
alter table public.plan_invoices add constraint plan_invoices_status_check CHECK ((status = ANY (ARRAY['open'::text, 'awaiting_confirmation'::text, 'paid'::text, 'overdue'::text, 'canceled'::text])));
alter table public.plan_upgrade_requests add constraint plan_upgrade_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'done'::text, 'dismissed'::text])));
alter table public.products add constraint products_price_cents_check CHECK ((price_cents >= 0));
alter table public.subscriptions add constraint subscriptions_billing_status_check CHECK ((billing_status = ANY (ARRAY['current'::text, 'past_due'::text, 'suspended'::text])));
alter table public.ar_generations add constraint ar_generations_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table public.ar_generations add constraint ar_generations_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
alter table public.categories add constraint categories_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
alter table public.coupons add constraint coupons_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
alter table public.delivery_zones add constraint delivery_zones_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
alter table public.leads add constraint leads_converted_store_id_fkey FOREIGN KEY (converted_store_id) REFERENCES stores(id) ON DELETE SET NULL;
alter table public.order_item_options add constraint order_item_options_option_id_fkey FOREIGN KEY (option_id) REFERENCES product_options(id) ON DELETE SET NULL;
alter table public.order_item_options add constraint order_item_options_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE;
alter table public.order_items add constraint order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
alter table public.order_items add constraint order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
alter table public.order_payments add constraint order_payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
alter table public.order_payments add constraint order_payments_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
alter table public.order_status_history add constraint order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
alter table public.order_status_history add constraint order_status_history_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
alter table public.orders add constraint orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
alter table public.plan_invoices add constraint plan_invoices_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
alter table public.plan_upgrade_requests add constraint plan_upgrade_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.plan_upgrade_requests add constraint plan_upgrade_requests_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
alter table public.product_option_groups add constraint product_option_groups_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table public.product_option_groups add constraint product_option_groups_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
alter table public.product_options add constraint product_options_group_id_fkey FOREIGN KEY (group_id) REFERENCES product_option_groups(id) ON DELETE CASCADE;
alter table public.product_options add constraint product_options_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
alter table public.products add constraint products_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
alter table public.products add constraint products_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
alter table public.push_subscriptions add constraint push_subscriptions_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
alter table public.store_payment_credentials add constraint store_payment_credentials_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
alter table public.stores add constraint stores_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.subscriptions add constraint subscriptions_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

-- ── Índices ─────────────────────────────────────────────────
CREATE INDEX ar_generations_product ON public.ar_generations USING btree (product_id, created_at DESC);
CREATE INDEX ar_generations_store_month ON public.ar_generations USING btree (store_id, created_at DESC);
CREATE INDEX categories_store_id_idx ON public.categories USING btree (store_id);
CREATE INDEX idx_coupons_store ON public.coupons USING btree (store_id);
CREATE INDEX idx_zones_store ON public.delivery_zones USING btree (store_id);
CREATE INDEX leads_status_created_idx ON public.leads USING btree (status, created_at DESC);
CREATE INDEX idx_leads_converted_store_id ON public.leads USING btree (converted_store_id);
CREATE INDEX idx_order_item_options_item ON public.order_item_options USING btree (order_item_id);
CREATE INDEX idx_order_item_options_option_id ON public.order_item_options USING btree (option_id);
CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);
CREATE INDEX order_items_order_id_idx ON public.order_items USING btree (order_id);
CREATE UNIQUE INDEX order_payments_provider_pid_uidx ON public.order_payments USING btree (provider, provider_payment_id) WHERE (provider_payment_id IS NOT NULL);
CREATE INDEX order_payments_order_id_idx ON public.order_payments USING btree (order_id);
CREATE INDEX idx_order_status_history_store_id ON public.order_status_history USING btree (store_id);
CREATE INDEX idx_osh_order ON public.order_status_history USING btree (order_id, changed_at);
CREATE INDEX orders_store_payment_status_idx ON public.orders USING btree (store_id, payment_status);
CREATE INDEX orders_store_created_idx ON public.orders USING btree (store_id, created_at DESC);
CREATE INDEX idx_orders_store_created ON public.orders USING btree (store_id, created_at);
CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);
CREATE INDEX orders_store_status_idx ON public.orders USING btree (store_id, status);
CREATE INDEX plan_invoices_status_idx ON public.plan_invoices USING btree (status, due_date);
CREATE INDEX plan_invoices_store_idx ON public.plan_invoices USING btree (store_id, competence DESC);
CREATE INDEX plan_upgrade_requests_status_created_idx ON public.plan_upgrade_requests USING btree (status, created_at DESC);
CREATE UNIQUE INDEX plan_upgrade_requests_one_pending ON public.plan_upgrade_requests USING btree (store_id) WHERE (status = 'pending'::text);
CREATE INDEX idx_option_groups_product ON public.product_option_groups USING btree (product_id);
CREATE INDEX idx_product_option_groups_store_id ON public.product_option_groups USING btree (store_id);
CREATE INDEX idx_options_group ON public.product_options USING btree (group_id);
CREATE INDEX idx_product_options_store_id ON public.product_options USING btree (store_id);
CREATE INDEX idx_products_category_id ON public.products USING btree (category_id);
CREATE INDEX products_store_id_idx ON public.products USING btree (store_id, category_id);
CREATE INDEX idx_push_subs_store ON public.push_subscriptions USING btree (store_id);
CREATE INDEX stores_owner_id_idx ON public.stores USING btree (owner_id);

-- ── View pública da loja ────────────────────────────────────
create or replace view public.store_public as
 SELECT id, slug, name, whatsapp_number, address, min_order_cents, is_open, theme,
    delivery_enabled, pickup_enabled, dine_in_enabled, delivery_fee_cents,
    estimated_prep_min, estimated_delivery_min, accepts_cash, accepts_card, accepts_pix,
    pix_key, opening_hours, auto_hours, checkout_mode, pix_key_type,
    online_payment_enabled, mp_connected, billing_suspended
   FROM stores;

-- ── Funções ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.today_sp()
 RETURNS date
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select (now() at time zone 'America/Sao_Paulo')::date;
$function$;

CREATE OR REPLACE FUNCTION public.price_for_plan(p plan_tier)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case
    when p = 'pro'  then 14900
    when p = 'plus' then 6900
    else 2900
  end;
$function$;

CREATE OR REPLACE FUNCTION public.hhmm_to_minutes(p_time text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case
    when p_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      then split_part(p_time, ':', 1)::int * 60 + split_part(p_time, ':', 2)::int
    else null
  end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_overview(p_month_start timestamp with time zone, p_prev_start timestamp with time zone, p_prev_end timestamp with time zone, p_chart_start timestamp with time zone)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'orders_month', (
      select count(*) from orders
      where status <> 'cancelado' and created_at >= p_month_start
    ),
    'gmv_month', (
      select coalesce(sum(case when total_cents > 0 then total_cents else subtotal_cents end), 0)
      from orders
      where status <> 'cancelado' and created_at >= p_month_start
    ),
    'orders_prev', (
      select count(*) from orders
      where status <> 'cancelado'
        and created_at >= p_prev_start
        and created_at <= p_prev_end
    ),
    'orders_by_store', (
      select coalesce(jsonb_object_agg(store_id, c), '{}'::jsonb)
      from (
        select store_id, count(*) c from orders
        where status <> 'cancelado' and created_at >= p_month_start
        group by store_id
      ) t
    ),
    'daily', (
      select coalesce(jsonb_object_agg(d, c), '{}'::jsonb)
      from (
        select to_char((created_at at time zone 'America/Sao_Paulo')::date, 'DD/MM') d, count(*) c
        from orders
        where status <> 'cancelado' and created_at >= p_chart_start
        group by 1
      ) t
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.admin_store_stats(p_month_start timestamp with time zone)
 RETURNS TABLE(store_id uuid, orders bigint, gmv_cents bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    o.store_id,
    count(*) as orders,
    coalesce(sum(case when o.total_cents > 0 then o.total_cents else o.subtotal_cents end), 0) as gmv_cents
  from orders o
  where o.status <> 'cancelado' and o.created_at >= p_month_start
  group by o.store_id;
$function$;

CREATE OR REPLACE FUNCTION public.assign_order_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.order_number is null then
    perform pg_advisory_xact_lock(hashtext(new.store_id::text));
    select coalesce(max(order_number), 0) + 1 into new.order_number
    from public.orders where store_id = new.store_id;
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.clear_setup_unlock_when_current()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.billing_status = 'current' and new.setup_unlocked then
    new.setup_unlocked := false;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_default_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_price integer;
  v_today date := public.today_sp();
begin
  v_price := public.price_for_plan('free');

  insert into subscriptions (store_id, plan, status, billing_enabled, billing_status,
                             next_due_date, suspended_at)
  values (new.id, 'free', 'active', true, 'suspended', v_today, now());

  insert into plan_invoices (store_id, competence, amount_cents, due_date, status)
  values (new.id, date_trunc('month', v_today)::date, v_price, v_today, 'open');

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_manual_order(p_store_id uuid, p_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order_id uuid;
  v_subtotal int := 0;
  v_item jsonb;
  v_opt jsonb;
  v_product products%rowtype;
  v_store stores%rowtype;
  v_item_id uuid;
  v_unit int;
  v_qty int;
  v_type order_type;
  v_pay payment_method;
  v_status order_status;
  v_scheduled timestamptz;
  v_option product_options%rowtype;
  v_group product_option_groups%rowtype;
  v_sel_count int;
  v_month_orders int;
begin
  select * into v_store from stores where id = p_store_id and owner_id = auth.uid();
  if not found then raise exception 'Loja não encontrada'; end if;

  -- Mensalidade da plataforma suspensa: nem o balcão registra venda.
  if v_store.billing_suspended then raise exception 'loja_suspensa'; end if;

  -- Plano Lite: mesmo limite de vendas do create_order (não conta pedidos sem pagamento confirmado).
  if not exists (
    select 1 from subscriptions s
    where s.store_id = p_store_id and s.plan = 'pro' and s.status = 'active'
  ) then
    select count(*) into v_month_orders
    from orders o
    where o.store_id = p_store_id
      and o.status <> 'cancelado'
      and o.payment_status in ('not_required','paid')
      and o.created_at >= date_trunc('month', now());
    if v_month_orders >= 60 then
      raise exception 'limite_pedidos_mes';
    end if;
  end if;

  v_type := coalesce((p_payload->>'order_type')::order_type, 'pickup');
  if v_type not in ('pickup', 'dine_in') then
    raise exception 'Pedido manual é apenas presencial (balcão ou mesa)';
  end if;

  v_status := coalesce((p_payload->>'status')::order_status, 'novo');
  if v_status not in ('novo', 'concluido') then
    raise exception 'Status inválido para pedido manual';
  end if;

  v_scheduled := nullif(p_payload->>'scheduled_for', '')::timestamptz;
  if v_scheduled is not null then
    if v_scheduled < now() - interval '5 minutes' then
      raise exception 'O horário do agendamento já passou';
    end if;
    v_status := 'agendado';
  end if;

  if p_payload->'items' is null or jsonb_array_length(p_payload->'items') = 0 then
    raise exception 'Carrinho vazio';
  end if;

  v_pay := (p_payload->>'payment_method')::payment_method;

  insert into orders (store_id, customer_name, customer_phone, customer_note, subtotal_cents,
                      order_type, payment_method, change_for_cents, table_number, status, source, scheduled_for)
  values (p_store_id,
          coalesce(
            nullif(p_payload->>'customer_name', ''),
            case when nullif(p_payload->>'table_number', '') is not null
                 then 'Mesa ' || (p_payload->>'table_number')
                 else 'Balcão' end
          ),
          nullif(p_payload->>'customer_phone', ''),
          nullif(p_payload->>'customer_note', ''),
          0, v_type, v_pay,
          nullif(p_payload->>'change_for_cents', '')::int,
          nullif(p_payload->>'table_number', ''),
          v_status, 'manual', v_scheduled)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_payload->'items')
  loop
    select * into v_product from products
      where id = (v_item->>'product_id')::uuid and store_id = p_store_id and is_active = true;
    if not found then raise exception 'Produto indisponível'; end if;

    v_qty := greatest(1, coalesce((v_item->>'quantity')::int, 1));
    v_unit := v_product.price_cents;

    insert into order_items (order_id, product_id, product_name_snapshot, unit_price_cents, quantity)
    values (v_order_id, v_product.id, v_product.name, 0, v_qty)
    returning id into v_item_id;

    if v_item->'options' is not null then
      for v_opt in select * from jsonb_array_elements(v_item->'options')
      loop
        select * into v_option from product_options
          where id = (v_opt->>'option_id')::uuid and is_active = true and store_id = p_store_id;
        if not found then raise exception 'Opção indisponível'; end if;
        select * into v_group from product_option_groups where id = v_option.group_id;
        if v_group.product_id <> v_product.id then raise exception 'Opção não pertence ao produto'; end if;

        v_unit := v_unit + v_option.price_delta_cents;
        insert into order_item_options (order_item_id, option_id, group_name_snapshot, name_snapshot, price_delta_cents_snapshot)
        values (v_item_id, v_option.id, v_group.name, v_option.name, v_option.price_delta_cents);
      end loop;
    end if;

    for v_group in select * from product_option_groups where product_id = v_product.id
    loop
      select count(*) into v_sel_count
      from jsonb_array_elements(coalesce(v_item->'options', '[]'::jsonb)) o
      join product_options po on po.id = (o->>'option_id')::uuid
      where po.group_id = v_group.id;
      if v_group.required and v_sel_count < greatest(1, v_group.min_select) then
        raise exception 'Escolha as opções obrigatórias de "%"', v_group.name;
      end if;
      if v_group.max_select > 0 and v_sel_count > v_group.max_select then
        raise exception 'Máximo de % opções em "%"', v_group.max_select, v_group.name;
      end if;
    end loop;

    update order_items set unit_price_cents = v_unit where id = v_item_id;
    v_subtotal := v_subtotal + v_unit * v_qty;
  end loop;

  update orders set
    subtotal_cents = v_subtotal,
    total_cents = v_subtotal
  where id = v_order_id;

  return v_order_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.is_within_opening_hours(p_hours jsonb, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  v_days text[] := array['mon','tue','wed','thu','fri','sat','sun'];
  v_local timestamp;
  v_min int;
  v_dow int;
  v_today jsonb;
  v_prev jsonb;
  v_r jsonb;
  v_open int;
  v_close int;
  v_has_any boolean;
begin
  if p_hours is null or jsonb_typeof(p_hours) <> 'object' then return true; end if;

  select exists (
    select 1 from unnest(v_days) d
    where jsonb_typeof(p_hours -> d) = 'array' and jsonb_array_length(p_hours -> d) > 0
  ) into v_has_any;
  if not v_has_any then return true; end if;

  v_local := p_now at time zone 'America/Sao_Paulo';
  v_min := extract(hour from v_local)::int * 60 + extract(minute from v_local)::int;
  v_dow := extract(isodow from v_local)::int;  -- 1 = segunda ... 7 = domingo

  v_today := p_hours -> v_days[v_dow];
  v_prev  := p_hours -> v_days[case when v_dow = 1 then 7 else v_dow - 1 end];

  if jsonb_typeof(v_today) = 'array' then
    for v_r in select * from jsonb_array_elements(v_today)
    loop
      v_open := public.hhmm_to_minutes(v_r ->> 'open');
      v_close := public.hhmm_to_minutes(v_r ->> 'close');
      if v_open is null or v_close is null then continue; end if;
      if v_close > v_open then
        if v_min >= v_open and v_min < v_close then return true; end if;
      else
        -- Faixa que vira a madrugada: aberta do horário de abrir até 23:59.
        if v_min >= v_open then return true; end if;
      end if;
    end loop;
  end if;

  -- Rabo da faixa de ontem que atravessou a meia-noite (ex.: sáb 18:00 → 01:00).
  if jsonb_typeof(v_prev) = 'array' then
    for v_r in select * from jsonb_array_elements(v_prev)
    loop
      v_open := public.hhmm_to_minutes(v_r ->> 'open');
      v_close := public.hhmm_to_minutes(v_r ->> 'close');
      if v_open is null or v_close is null then continue; end if;
      if v_close <= v_open and v_min < v_close then return true; end if;
    end loop;
  end if;

  return false;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_order(p_store_id uuid, p_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order_id uuid;
  v_subtotal int := 0;
  v_delivery_fee int := 0;
  v_discount int := 0;
  v_item jsonb;
  v_opt jsonb;
  v_product products%rowtype;
  v_store stores%rowtype;
  v_item_id uuid;
  v_unit int;
  v_qty int;
  v_type order_type;
  v_pay payment_method;
  v_payment_status payment_status;
  v_zone delivery_zones%rowtype;
  v_coupon coupons%rowtype;
  v_option product_options%rowtype;
  v_group product_option_groups%rowtype;
  v_sel_count int;
  v_nbhd text;
  v_month_orders int;
begin
  select * into v_store from stores where id = p_store_id;
  if not found then raise exception 'Loja não encontrada'; end if;

  -- Mensalidade da plataforma em atraso além da carência: cardápio fora do ar.
  -- Checado aqui também porque a UI é só a primeira barreira (link direto ainda chamaria a RPC).
  if v_store.billing_suspended then raise exception 'loja_suspensa'; end if;

  if not v_store.is_open then raise exception 'Loja fechada no momento'; end if;

  -- Horário de funcionamento: só vale quando o lojista ligou o modo automático.
  -- Sem isso, um cliente com a aba aberta desde antes do fechamento ainda
  -- conseguiria enviar o pedido — o bloqueio da UI é só a primeira barreira.
  if v_store.auto_hours and not public.is_within_opening_hours(v_store.opening_hours, now()) then
    raise exception 'fora_horario';
  end if;

  -- Plano Lite: máximo de 60 pedidos por mês que CONTAM como venda (pagos ou sem pagamento
  -- online). Pedidos aguardando/sem pagamento confirmado não contam.
  if not exists (
    select 1 from subscriptions s
    where s.store_id = p_store_id and s.plan = 'pro' and s.status = 'active'
  ) then
    select count(*) into v_month_orders
    from orders o
    where o.store_id = p_store_id
      and o.status <> 'cancelado'
      and o.payment_status in ('not_required','paid')
      and o.created_at >= date_trunc('month', now());
    if v_month_orders >= 60 then
      raise exception 'limite_pedidos_mes';
    end if;
  end if;

  v_type := coalesce((p_payload->>'order_type')::order_type, 'delivery');
  if v_type = 'delivery' and not v_store.delivery_enabled then raise exception 'Entrega indisponível'; end if;
  if v_type = 'pickup'   and not v_store.pickup_enabled   then raise exception 'Retirada indisponível'; end if;
  if v_type = 'dine_in'  and not v_store.dine_in_enabled  then raise exception 'Pedido na mesa indisponível'; end if;

  if p_payload->'items' is null or jsonb_array_length(p_payload->'items') = 0 then
    raise exception 'Carrinho vazio';
  end if;
  if v_type = 'delivery' and coalesce(p_payload#>>'{address,neighborhood}','') = '' then
    raise exception 'Informe o endereço de entrega';
  end if;

  v_pay := (p_payload->>'payment_method')::payment_method;

  -- Pagamento online (Mercado Pago): Pix e cartão online.
  -- 'card_online' SÓ existe com pagamento online habilitado — sem isso o pedido sairia
  -- como not_required e a loja nunca receberia.
  v_payment_status := 'not_required';
  if v_store.online_payment_enabled and v_store.mp_connected
     and v_pay in ('pix','card_online') then
    v_payment_status := 'pending';
  elsif v_pay = 'card_online' then
    raise exception 'Pagamento com cartão online indisponível';
  end if;

  insert into orders (store_id, customer_name, customer_phone, customer_note, subtotal_cents,
                      order_type, payment_method, payment_status, change_for_cents, table_number, coupon_code,
                      address_cep, address_street, address_number, address_complement, address_neighborhood, address_reference)
  values (p_store_id,
          coalesce(p_payload->>'customer_name',''),
          nullif(p_payload->>'customer_phone',''),
          nullif(p_payload->>'customer_note',''),
          0, v_type, v_pay, v_payment_status,
          nullif(p_payload->>'change_for_cents','')::int,
          nullif(p_payload->>'table_number',''),
          nullif(p_payload->>'coupon_code',''),
          nullif(p_payload#>>'{address,cep}',''),
          nullif(p_payload#>>'{address,street}',''),
          nullif(p_payload#>>'{address,number}',''),
          nullif(p_payload#>>'{address,complement}',''),
          nullif(p_payload#>>'{address,neighborhood}',''),
          nullif(p_payload#>>'{address,reference}',''))
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_payload->'items')
  loop
    select * into v_product from products
      where id = (v_item->>'product_id')::uuid and store_id = p_store_id and is_active = true;
    if not found then raise exception 'Produto indisponível'; end if;

    v_qty := greatest(1, coalesce((v_item->>'quantity')::int, 1));
    v_unit := v_product.price_cents;

    insert into order_items (order_id, product_id, product_name_snapshot, unit_price_cents, quantity)
    values (v_order_id, v_product.id, v_product.name, 0, v_qty)
    returning id into v_item_id;

    if v_item->'options' is not null then
      for v_opt in select * from jsonb_array_elements(v_item->'options')
      loop
        select * into v_option from product_options
          where id = (v_opt->>'option_id')::uuid and is_active = true and store_id = p_store_id;
        if not found then raise exception 'Opção indisponível'; end if;
        select * into v_group from product_option_groups where id = v_option.group_id;
        if v_group.product_id <> v_product.id then raise exception 'Opção não pertence ao produto'; end if;

        v_unit := v_unit + v_option.price_delta_cents;
        insert into order_item_options (order_item_id, option_id, group_name_snapshot, name_snapshot, price_delta_cents_snapshot)
        values (v_item_id, v_option.id, v_group.name, v_option.name, v_option.price_delta_cents);
      end loop;
    end if;

    for v_group in select * from product_option_groups where product_id = v_product.id
    loop
      select count(*) into v_sel_count
      from jsonb_array_elements(coalesce(v_item->'options','[]'::jsonb)) o
      join product_options po on po.id = (o->>'option_id')::uuid
      where po.group_id = v_group.id;
      if v_group.required and v_sel_count < greatest(1, v_group.min_select) then
        raise exception 'Escolha as opções obrigatórias de "%"', v_group.name;
      end if;
      if v_group.max_select > 0 and v_sel_count > v_group.max_select then
        raise exception 'Máximo de % opções em "%"', v_group.max_select, v_group.name;
      end if;
    end loop;

    update order_items set unit_price_cents = v_unit where id = v_item_id;
    v_subtotal := v_subtotal + v_unit * v_qty;
  end loop;

  if v_subtotal < v_store.min_order_cents then
    raise exception 'Pedido abaixo do mínimo de %', v_store.min_order_cents;
  end if;

  if v_type = 'delivery' then
    v_nbhd := lower(trim(p_payload#>>'{address,neighborhood}'));
    select * into v_zone from delivery_zones
      where store_id = p_store_id and is_active = true and lower(trim(neighborhood)) = v_nbhd
      limit 1;
    if found then
      v_delivery_fee := v_zone.fee_cents;
      if v_subtotal < v_zone.min_order_cents then
        raise exception 'Pedido abaixo do mínimo para % de %', v_zone.neighborhood, v_zone.min_order_cents;
      end if;
    else
      v_delivery_fee := v_store.delivery_fee_cents;
    end if;
  end if;

  if nullif(p_payload->>'coupon_code','') is not null then
    select * into v_coupon from coupons
      where store_id = p_store_id and lower(code) = lower(p_payload->>'coupon_code') and is_active = true;
    if not found then raise exception 'Cupom inválido'; end if;
    if v_coupon.expires_at is not null and v_coupon.expires_at < now() then raise exception 'Cupom expirado'; end if;
    if v_coupon.max_uses is not null and v_coupon.uses >= v_coupon.max_uses then raise exception 'Cupom esgotado'; end if;
    if v_subtotal < v_coupon.min_order_cents then raise exception 'Cupom exige pedido mínimo de %', v_coupon.min_order_cents; end if;
    if v_coupon.kind = 'percent' then
      v_discount := (v_subtotal * v_coupon.value) / 100;
    elsif v_coupon.kind = 'fixed' then
      v_discount := least(v_coupon.value, v_subtotal);
    elsif v_coupon.kind = 'free_shipping' then
      v_delivery_fee := 0;
    end if;
    update coupons set uses = uses + 1 where id = v_coupon.id;
  end if;

  update orders set
    subtotal_cents = v_subtotal,
    delivery_fee_cents = v_delivery_fee,
    discount_cents = v_discount,
    total_cents = greatest(0, v_subtotal + v_delivery_fee - v_discount)
  where id = v_order_id;

  return v_order_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_order(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_result jsonb;
begin
  select jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'order_type', o.order_type,
    'created_at', o.created_at,
    'customer_name', o.customer_name,
    'subtotal_cents', o.subtotal_cents,
    'delivery_fee_cents', o.delivery_fee_cents,
    'discount_cents', o.discount_cents,
    'total_cents', o.total_cents,
    'payment_method', o.payment_method,
    'payment_status', o.payment_status,
    'store_name', s.name,
    'store_slug', s.slug,
    'estimated_prep_min', s.estimated_prep_min,
    'estimated_delivery_min', s.estimated_delivery_min,
    'pix_key', s.pix_key,
    'pix_key_type', s.pix_key_type,
    'payment', (
      select jsonb_build_object(
        'method', op.method,
        'status', op.status,
        'qr_code', op.qr_code,
        'qr_code_base64', op.qr_code_base64,
        'ticket_url', op.ticket_url,
        'expires_at', op.expires_at
      )
      from order_payments op where op.order_id = o.id
      order by op.created_at desc limit 1
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', oi.product_name_snapshot,
        'quantity', oi.quantity,
        'unit_price_cents', oi.unit_price_cents,
        'options', coalesce((select jsonb_agg(io.name_snapshot) from order_item_options io where io.order_item_id = oi.id), '[]'::jsonb)
      )) from order_items oi where oi.order_id = o.id
    ), '[]'::jsonb)
  ) into v_result
  from orders o join stores s on s.id = o.store_id
  where o.id = p_id;
  return v_result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.log_order_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history(order_id, store_id, status)
    values (new.id, new.store_id, new.status);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.order_status_history(order_id, store_id, status)
    values (new.id, new.store_id, new.status);
  end if;
  return new;
end $function$;

-- DEV: em produção esta função chama /api/push/send (pg_net) com um segredo.
-- Aqui ela não faz nada — pedido de teste não pode disparar push real.
CREATE OR REPLACE FUNCTION public.notify_new_order_push()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.preview_coupon(p_store_id uuid, p_code text, p_subtotal_cents integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_c coupons%rowtype;
  v_sub int := greatest(0, coalesce(p_subtotal_cents, 0));
begin
  if coalesce(trim(p_code), '') = '' then
    return jsonb_build_object('valid', false, 'reason', 'Informe um cupom.');
  end if;

  select * into v_c from coupons
    where store_id = p_store_id
      and lower(code) = lower(trim(p_code))
      and is_active = true;
  if not found then
    return jsonb_build_object('valid', false, 'reason', 'Cupom inválido.');
  end if;
  if v_c.expires_at is not null and v_c.expires_at < now() then
    return jsonb_build_object('valid', false, 'reason', 'Cupom expirado.');
  end if;
  if v_c.max_uses is not null and v_c.uses >= v_c.max_uses then
    return jsonb_build_object('valid', false, 'reason', 'Cupom esgotado.');
  end if;
  if v_sub < v_c.min_order_cents then
    return jsonb_build_object(
      'valid', false,
      'reason', 'Cupom válido em pedidos a partir de R$ ' ||
                translate(trim(to_char(v_c.min_order_cents / 100.0, 'FM999999990.00')), '.', ','),
      'min_order_cents', v_c.min_order_cents
    );
  end if;

  return jsonb_build_object(
    'valid', true,
    'code', upper(v_c.code),
    'kind', v_c.kind,
    'value', v_c.value,
    'free_shipping', v_c.kind = 'free_shipping',
    'discount_cents', case
      when v_c.kind = 'percent' then (v_sub * v_c.value) / 100
      when v_c.kind = 'fixed'   then least(v_c.value, v_sub)
      else 0
    end
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_price_to_plan()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  new.price_cents := public.price_for_plan(new.plan);
  if new.next_due_date is null then
    new.next_due_date := public.today_sp();
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_store_billing_suspended()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.stores
     set billing_suspended = (new.billing_status = 'suspended')
   where id = new.store_id
     and billing_suspended is distinct from (new.billing_status = 'suspended');
  return new;
end;
$function$;

-- ── Permissões de EXECUTE (iguais às de produção) ───────────
revoke execute on function public.admin_overview(timestamptz, timestamptz, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.admin_store_stats(timestamptz) from public, anon, authenticated;
revoke execute on function public.assign_order_number() from public, anon, authenticated;
revoke execute on function public.clear_setup_unlock_when_current() from public, anon, authenticated;
revoke execute on function public.create_default_subscription() from public, anon, authenticated;
revoke execute on function public.log_order_status() from public, anon, authenticated;
revoke execute on function public.sync_price_to_plan() from public, anon, authenticated;
revoke execute on function public.sync_store_billing_suspended() from public, anon, authenticated;
revoke execute on function public.create_manual_order(uuid, jsonb) from public, anon;
revoke execute on function public.notify_new_order_push() from public;
revoke execute on function public.preview_coupon(uuid, text, integer) from public;

-- ── Gatilhos ────────────────────────────────────────────────
CREATE TRIGGER order_payments_set_updated_at BEFORE UPDATE ON public.order_payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_assign_order_number BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION assign_order_number();
CREATE TRIGGER trg_log_order_status AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION log_order_status();
CREATE TRIGGER trg_notify_new_order_push AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION notify_new_order_push();
CREATE TRIGGER plan_invoices_set_updated_at BEFORE UPDATE ON public.plan_invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER platform_settings_set_updated_at BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER store_payment_credentials_set_updated_at BEFORE UPDATE ON public.store_payment_credentials FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stores_create_default_subscription AFTER INSERT ON public.stores FOR EACH ROW EXECUTE FUNCTION create_default_subscription();
CREATE TRIGGER subscriptions_clear_setup_unlock BEFORE UPDATE OF billing_status ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION clear_setup_unlock_when_current();
CREATE TRIGGER subscriptions_set_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER subscriptions_sync_billing_suspended AFTER INSERT OR UPDATE OF billing_status ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION sync_store_billing_suspended();
CREATE TRIGGER subscriptions_sync_price_to_plan BEFORE INSERT OR UPDATE OF plan ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION sync_price_to_plan();

-- ── Segurança por linha (RLS) ───────────────────────────────
alter table public.plan_invoices enable row level security;
alter table public.platform_settings enable row level security;
alter table public.product_option_groups enable row level security;
alter table public.order_item_options enable row level security;
alter table public.product_options enable row level security;
alter table public.stores enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.ar_generations enable row level security;
alter table public.coupons enable row level security;
alter table public.subscriptions enable row level security;
alter table public.order_items enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.order_status_history enable row level security;
alter table public.orders enable row level security;
alter table public.store_payment_credentials enable row level security;
alter table public.order_payments enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.leads enable row level security;
alter table public.plan_upgrade_requests enable row level security;

create policy ar_generations_own on public.ar_generations as PERMISSIVE for ALL to public using ((store_id IN ( SELECT stores.id FROM stores WHERE (stores.owner_id = auth.uid())))) with check ((store_id IN ( SELECT stores.id FROM stores WHERE (stores.owner_id = auth.uid()))));
create policy categories_public_read on public.categories as PERMISSIVE for SELECT to public using (true);
create policy categories_write_own on public.categories as PERMISSIVE for ALL to public using ((store_id IN ( SELECT stores.id FROM stores WHERE (stores.owner_id = auth.uid())))) with check ((store_id IN ( SELECT stores.id FROM stores WHERE (stores.owner_id = auth.uid()))));
create policy coupons_write_own on public.coupons as PERMISSIVE for ALL to public using ((store_id IN ( SELECT stores.id FROM stores WHERE (stores.owner_id = auth.uid())))) with check ((store_id IN ( SELECT stores.id FROM stores WHERE (stores.owner_id = auth.uid()))));
create policy zones_public_read on public.delivery_zones as PERMISSIVE for SELECT to public using (true);
create policy zones_write_own on public.delivery_zones as PERMISSIVE for ALL to public using ((store_id IN ( SELECT stores.id FROM stores WHERE (stores.owner_id = auth.uid())))) with check ((store_id IN ( SELECT stores.id FROM stores WHERE (stores.owner_id = auth.uid()))));
create policy leads_insert_anon on public.leads as PERMISSIVE for INSERT to anon, authenticated with check (true);
create policy order_item_options_select_own on public.order_item_options as PERMISSIVE for SELECT to public using ((order_item_id IN ( SELECT oi.id FROM ((order_items oi JOIN orders o ON ((o.id = oi.order_id))) JOIN stores s ON ((s.id = o.store_id))) WHERE (s.owner_id = auth.uid()))));
create policy order_items_select_own on public.order_items as PERMISSIVE for SELECT to public using ((order_id IN ( SELECT o.id FROM (orders o JOIN stores s ON ((s.id = o.store_id))) WHERE (s.owner_id = auth.uid()))));
create policy osh_select_own on public.order_status_history as PERMISSIVE for SELECT to public using ((store_id IN ( SELECT stores.id FROM stores WHERE (stores.owner_id = auth.uid()))));
create policy orders_select_own on public.orders as PERMISSIVE for SELECT to public using ((store_id IN ( SELECT stores.id FROM stores WHERE (stores.owner_id = auth.uid()))));
create policy orders_update_own on public.orders as PERMISSIVE for UPDATE to public using ((store_id IN ( SELECT stores.id FROM stores WHERE (stores.owner_id = auth.uid()))));
create policy "owner reads own plan invoices" on public.plan_invoices as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1 FROM stores s WHERE ((s.id = plan_invoices.store_id) AND (s.owner_id = ( SELECT auth.uid() AS uid))))));
create policy "owner reads own upgrade requests" on public.plan_upgrade_requests as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1 FROM stores s WHERE ((s.id = plan_upgrade_requests.store_id) AND (s.owner_id = ( SELECT auth.uid() AS uid))))));
create policy option_groups_public_read on public.product_option_groups as PERMISSIVE for SELECT to public using (true);
create policy option_groups_write_own on public.product_option_groups as PERMISSIVE for ALL to public using ((store_id IN ( SELECT stores.id FROM stores WHERE (stores.owner_id = auth.uid())))) with check ((store_id IN ( SELECT stores.id FROM stores WHERE (stores.owner_id = auth.uid()))));
create policy options_public_read on public.product_options as PERMISSIVE for SELECT to public using (true);
create policy options_write_own on public.product_options as PERMISSIVE for ALL to public using ((store_id IN ( SELECT stores.id FROM stores WHERE (stores.owner_id = auth.uid())))) with check ((store_id IN ( SELECT stores.id FROM stores WHERE (stores.owner_id = auth.uid()))));
create policy products_public_read on public.products as PERMISSIVE for SELECT to public using (true);
create policy products_write_own on public.products as PERMISSIVE for ALL to public using ((store_id IN ( SELECT stores.id FROM stores WHERE (stores.owner_id = auth.uid())))) with check ((store_id IN ( SELECT stores.id FROM stores WHERE (stores.owner_id = auth.uid()))));
create policy push_subs_own on public.push_subscriptions as PERMISSIVE for ALL to authenticated using ((store_id IN ( SELECT stores.id FROM stores WHERE (stores.owner_id = ( SELECT auth.uid() AS uid))))) with check ((store_id IN ( SELECT stores.id FROM stores WHERE (stores.owner_id = ( SELECT auth.uid() AS uid)))));
create policy stores_delete_own on public.stores as PERMISSIVE for DELETE to public using ((owner_id = auth.uid()));
create policy stores_insert_own on public.stores as PERMISSIVE for INSERT to authenticated with check ((owner_id = auth.uid()));
create policy stores_public_read on public.stores as PERMISSIVE for SELECT to anon using (true);
create policy stores_select_own on public.stores as PERMISSIVE for SELECT to public using ((owner_id = auth.uid()));
create policy stores_update_own on public.stores as PERMISSIVE for UPDATE to public using ((owner_id = auth.uid()));
create policy subscriptions_select_own on public.subscriptions as PERMISSIVE for SELECT to public using ((store_id IN ( SELECT stores.id FROM stores WHERE (stores.owner_id = auth.uid()))));

-- ── Comentários ─────────────────────────────────────────────
comment on table public.plan_invoices is 'Fatura mensal que o LOJISTA paga para a plataforma (Pix na conta MP da plataforma).';
comment on table public.platform_settings is 'Config da plataforma. Chaves: pix_qr_pro, pix_qr_lite (payload Pix copia e cola).';
comment on table public.plan_upgrade_requests is 'Pedido de upgrade de plano feito pelo lojista dentro do painel. O admin atende em /admin/lojas — ativar o Pro fecha o pedido.';

-- ── Storage ─────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('store-assets', 'store-assets', true, 5242880, array['image/png','image/jpeg','image/jpg','image/webp','image/svg+xml','image/gif']),
  ('ar-models', 'ar-models', true, 26214400, null)
on conflict (id) do nothing;

create policy store_assets_owner_delete on storage.objects as PERMISSIVE for DELETE to authenticated using (((bucket_id = 'store-assets'::text) AND ((storage.foldername(name))[1] IN ( SELECT (stores.id)::text AS id FROM stores WHERE (stores.owner_id = auth.uid())))));
create policy store_assets_owner_insert on storage.objects as PERMISSIVE for INSERT to authenticated with check (((bucket_id = 'store-assets'::text) AND ((storage.foldername(name))[1] IN ( SELECT (stores.id)::text AS id FROM stores WHERE (stores.owner_id = auth.uid())))));
create policy store_assets_owner_update on storage.objects as PERMISSIVE for UPDATE to authenticated using (((bucket_id = 'store-assets'::text) AND ((storage.foldername(name))[1] IN ( SELECT (stores.id)::text AS id FROM stores WHERE (stores.owner_id = auth.uid()))))) with check (((bucket_id = 'store-assets'::text) AND ((storage.foldername(name))[1] IN ( SELECT (stores.id)::text AS id FROM stores WHERE (stores.owner_id = auth.uid())))));

-- ── Tempo real (contador de pedidos novos no painel) ────────
-- Em bloco pra poder rodar de novo: adicionar uma tabela que já está na
-- publicação dá erro.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_items') then
    alter publication supabase_realtime add table public.order_items;
  end if;
end $$;
