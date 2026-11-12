-- ============================================================
-- DEV: correção da baixa automática (pedido cancelado e depois reativado
-- não voltava a baixar). Rodar UMA vez no SQL Editor do banco de TESTES.
-- Em produção já vai junto em docs/migracao-estoque.sql.
-- ============================================================
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
