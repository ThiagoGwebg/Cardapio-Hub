-- ============================================================
-- DEV: limpa restos de uma montagem anterior ANTES de rodar o 01.
-- Apaga só os objetos do Cardápio Hub (tabelas, tipos, funções e as
-- políticas do Storage). Nunca rodar em produção — a trava abaixo se recusa
-- a continuar se o banco tiver QUALQUER pedido.
-- ============================================================
do $$
declare
  v_has_orders boolean := false;
begin
  -- SQL dinâmico: com a tabela inexistente, uma consulta estática nem compila.
  if to_regclass('public.orders') is not null then
    execute 'select exists (select 1 from public.orders)' into v_has_orders;
  end if;
  if v_has_orders then
    raise exception 'Este banco tem pedidos. Não parece o banco de TESTES — nada foi apagado.';
  end if;
end $$;

drop table if exists
  public.store_integrations,
  public.product_recipe_items,
  public.stock_movements,
  public.supplier_item_links,
  public.purchase_invoice_items,
  public.purchase_invoices,
  public.suppliers,
  public.stock_items,
  public.ar_generations,
  public.order_item_options,
  public.order_items,
  public.order_payments,
  public.order_status_history,
  public.orders,
  public.product_options,
  public.product_option_groups,
  public.products,
  public.categories,
  public.coupons,
  public.delivery_zones,
  public.leads,
  public.plan_invoices,
  public.plan_upgrade_requests,
  public.platform_settings,
  public.push_subscriptions,
  public.store_payment_credentials,
  public.subscriptions,
  public.stores
  cascade;
drop view if exists public.store_public cascade;

drop function if exists
  public.admin_overview(timestamptz, timestamptz, timestamptz, timestamptz),
  public.admin_store_stats(timestamptz),
  public.assign_order_number(),
  public.clear_setup_unlock_when_current(),
  public.create_default_subscription(),
  public.create_manual_order(uuid, jsonb),
  public.create_order(uuid, jsonb),
  public.get_order(uuid),
  public.hhmm_to_minutes(text),
  public.is_within_opening_hours(jsonb, timestamptz),
  public.log_order_status(),
  public.notify_new_order_push(),
  public.preview_coupon(uuid, text, integer),
  public.price_for_plan(public.plan_tier),
  public.set_updated_at(),
  public.sync_price_to_plan(),
  public.sync_store_billing_suspended(),
  public.today_sp(),
  public.apply_stock_movement(),
  public.stock_consuming_status(public.order_status),
  public.sync_order_stock(),
  public.launch_purchase_invoice(uuid)
  cascade;

drop type if exists
  public.order_status, public.plan_tier, public.subscription_status, public.order_type,
  public.payment_method, public.coupon_kind, public.checkout_mode, public.pix_key_type,
  public.payment_status
  cascade;

drop policy if exists store_assets_owner_delete on storage.objects;
drop policy if exists store_assets_owner_insert on storage.objects;
drop policy if exists store_assets_owner_update on storage.objects;
