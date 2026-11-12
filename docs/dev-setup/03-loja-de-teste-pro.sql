-- ============================================================
-- DEV: libera as lojas do banco de TESTES (rodar DEPOIS de criar a conta
-- pelo /signup do localhost). Nunca rodar em produção.
--
-- * Confirma o e-mail das contas (o Supabase pede confirmação por padrão).
-- * Põe as lojas no plano Pro com a mensalidade em dia — uma loja nova
--   nasce "suspensa" até o 1º pagamento (create_default_subscription).
-- ============================================================
update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now());

update public.subscriptions
   set plan = 'pro', status = 'active', billing_status = 'current', suspended_at = null;

update public.plan_invoices set status = 'paid', paid_at = coalesce(paid_at, now());
