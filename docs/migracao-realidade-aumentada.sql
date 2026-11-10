-- Realidade aumentada nos produtos (plano Pro).
--
-- O modelo 3D PUBLICADO fica no próprio produto (ar_model_url + ar_size_cm):
-- é só o que o cardápio público precisa ler. O pipeline de geração
-- (fotos -> IA -> revisão do lojista) vive em ar_generations, que também é a
-- base da cota mensal do Pro — contam todas as gerações do mês que não
-- falharam (falha na IA devolve a cota; descartar depois de pronta, não).
--
-- Rode no SQL Editor do Supabase (projeto cardapio-agil).

alter table public.products
  add column if not exists ar_model_url text,
  add column if not exists ar_size_cm numeric;

create table if not exists public.ar_generations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  task_id text,
  status text not null default 'processing'
    check (status in ('processing','ready','published','discarded','failed')),
  model_url text,
  preview_url text,
  size_cm numeric,
  source_photos jsonb not null default '[]'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ar_generations_store_month
  on public.ar_generations (store_id, created_at desc);
create index if not exists ar_generations_product
  on public.ar_generations (product_id, created_at desc);

alter table public.ar_generations enable row level security;

-- Só o dono da loja enxerga e mexe nas gerações dela; o cliente final nunca
-- precisa desta tabela (o cardápio lê ar_model_url direto do produto).
create policy ar_generations_own on public.ar_generations
  for all
  using (store_id in (select id from public.stores where owner_id = auth.uid()))
  with check (store_id in (select id from public.stores where owner_id = auth.uid()));
