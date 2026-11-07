-- Rotação do x-push-secret — iniciada em 2026-11-07
--
-- POR QUÊ
-- A função trg_notify_new_order_push carregava o segredo em texto puro no
-- próprio corpo, o que deixa ele legível em pg_proc.prosrc para qualquer um
-- com acesso SQL, em qualquer dump e no painel do Supabase. Esse segredo é a
-- única coisa que protege /api/push/send: quem o tiver dispara notificação
-- para o celular de todos os lojistas.
--
-- ORDEM IMPORTA
-- O endpoint compara com um valor só, então trocar um lado antes do outro
-- derruba a notificação de pedido no intervalo. Por isso o endpoint passou a
-- aceitar uma lista separada por vírgula (app/api/push/send/route.js) e a
-- troca acontece em quatro passos, sem janela de queda.


-- [APLICADO em 2026-11-07] Passo 1 — segredo novo no Vault
--
-- Gerado dentro do Postgres de propósito: assim o valor nunca passa pela
-- sessão de quem rodou a migração. Confirmado: 64 caracteres hex, diferente
-- do anterior.
--
--   select vault.create_secret(
--     encode(gen_random_bytes(32), 'hex'),
--     'push_hook_secret',
--     'Header x-push-secret usado pelo gatilho trg_notify_new_order_push...'
--   );
--
-- Para ler o valor: painel do Supabase > Project Settings > Vault, ou
--   select decrypted_secret from vault.decrypted_secrets where name = 'push_hook_secret';


-- [PENDENTE — passo seu] Passo 2 — Vercel aceita os dois
--
-- Em Project Settings > Environment Variables, PUSH_HOOK_SECRET passa a ser
-- os dois valores separados por vírgula, sem espaço:
--
--   <valor antigo>,<valor novo do Vault>
--
-- Depois faça o deploy. A partir daqui o endpoint aceita os dois, e nenhuma
-- notificação cai durante o resto da troca.


-- [PENDENTE — só depois do passo 2 estar no ar] Passo 3 — função lê do Vault
--
-- Enquanto o passo 2 não subir, NÃO rode isto: a função passaria a mandar o
-- segredo novo para um endpoint que ainda não o reconhece, e todo push viraria
-- 403 silencioso.

create or replace function public.notify_new_order_push()
returns trigger
language plpgsql
security definer
set search_path = public, vault, net
as $function$
declare
  v_secret text;
begin
  if TG_OP = 'INSERT' then
    if not (NEW.status = 'novo' and NEW.payment_status <> 'pending') then
      return NEW;
    end if;
  elsif TG_OP = 'UPDATE' then
    if not (NEW.payment_status = 'paid' and OLD.payment_status is distinct from NEW.payment_status) then
      return NEW;
    end if;
  else
    return NEW;
  end if;

  -- Segredo fora do corpo da função: só o dono (postgres, que é quem roda esta
  -- SECURITY DEFINER) enxerga vault.decrypted_secrets.
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'push_hook_secret';

  -- Sem segredo configurado não adianta chamar: o endpoint responderia 403 e a
  -- falha passaria despercebida dentro do gatilho.
  if v_secret is null then
    raise warning 'push_hook_secret ausente no Vault; notificacao do pedido % nao enviada', NEW.id;
    return NEW;
  end if;

  perform net.http_post(
    url := 'https://cardapioagil.vercel.app/api/push/send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', v_secret
    ),
    body := jsonb_build_object(
      'order_id', NEW.id,
      'store_id', NEW.store_id,
      'order_number', NEW.order_number,
      'customer_name', NEW.customer_name,
      'total_cents', NEW.total_cents
    )
  );
  return NEW;
end;
$function$;


-- [PENDENTE — depois de confirmar que a notificação chega] Passo 4 — tira o antigo
--
-- Na Vercel, PUSH_HOOK_SECRET volta a ter um valor só: o novo. A partir daí o
-- segredo antigo não vale mais em lugar nenhum.


-- PONTA SOLTA, não faz parte da rotação
-- A url acima aponta para cardapioagil.vercel.app, enquanto o site roda em
-- www.cardapiohub.com. Funciona pelo alias da Vercel, mas é uma referência ao
-- domínio antigo esperando para quebrar no dia em que o alias sair.
