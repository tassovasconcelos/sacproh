-- SACPROH SaaS: fechamento de IDOR, isolamento multiempresa e medicao de consumo.

-- Politicas sem RLS ativo nao protegem dados. Ativa e forca RLS em toda tabela operacional.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tenants','units','profiles','customers','product_families','products','ticket_sequences',
    'tickets','ticket_items','ticket_status_history','ticket_comments','ticket_attachments',
    'root_causes','action_plans','technical_cases','logistics_cases','survey_responses',
    'audit_logs','suppliers','invoices','ticket_invoices','service_orders','sla_policies','carriers'
  ] LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',t);
    END IF;
  END LOOP;
END $$;

-- A empresa e o perfil sao sempre derivados da sessao, nunca do navegador.
CREATE OR REPLACE FUNCTION public.user_tenant_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
  SELECT tenant_id FROM public.profiles WHERE id=auth.uid() AND is_active=true LIMIT 1
$$;
CREATE OR REPLACE FUNCTION public.user_role_code() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
  SELECT role_code FROM public.profiles WHERE id=auth.uid() AND is_active=true LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.user_tenant_id() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.user_role_code() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.user_tenant_id(),public.user_role_code() TO authenticated;

-- SUPERADMIN e administrador continuam confinados ao proprio cliente.
DROP POLICY IF EXISTS tenants_read_own ON public.tenants;
CREATE POLICY tenants_read_own ON public.tenants FOR SELECT TO authenticated
  USING(id=public.user_tenant_id());
DROP POLICY IF EXISTS profiles_read_tenant ON public.profiles;
CREATE POLICY profiles_read_tenant ON public.profiles FOR SELECT TO authenticated
  USING(tenant_id=public.user_tenant_id() OR id=auth.uid());
DROP POLICY IF EXISTS profiles_admin_write ON public.profiles;
CREATE POLICY profiles_admin_write ON public.profiles FOR ALL TO authenticated
  USING(tenant_id=public.user_tenant_id() AND public.user_role_code() IN('SUPERADMIN','ADMIN_EMPRESA'))
  WITH CHECK(tenant_id=public.user_tenant_id() AND public.user_role_code() IN('SUPERADMIN','ADMIN_EMPRESA'));

CREATE OR REPLACE FUNCTION public.guard_profile_privilege() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
DECLARE caller_tenant uuid; caller_role text;
BEGIN
 IF auth.uid() IS NULL THEN RETURN NEW; END IF; -- operacao interna com service role
 caller_tenant:=public.user_tenant_id(); caller_role:=public.user_role_code();
 IF caller_tenant IS NULL OR NEW.tenant_id IS DISTINCT FROM caller_tenant THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Alteracao de empresa bloqueada.';
 END IF;
 IF TG_OP='UPDATE' AND OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Transferencia de usuario entre empresas bloqueada.';
 END IF;
 IF caller_role<>'SUPERADMIN' AND NEW.role_code='SUPERADMIN' THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Escalonamento de privilegio bloqueado.';
 END IF;
 IF TG_OP='UPDATE' AND OLD.id=auth.uid() AND OLD.role_code IS DISTINCT FROM NEW.role_code THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Usuario nao pode alterar o proprio perfil de acesso.';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_profiles_privilege_guard ON public.profiles;
CREATE TRIGGER trg_profiles_privilege_guard BEFORE INSERT OR UPDATE OF tenant_id,role_code ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privilege();

CREATE TABLE IF NOT EXISTS public.saas_plans(
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), code text NOT NULL UNIQUE, name text NOT NULL,
  monthly_price_cents integer NOT NULL CHECK(monthly_price_cents>=0),
  included_seats integer NOT NULL CHECK(included_seats>0),
  extra_seat_price_cents integer NOT NULL DEFAULT 0 CHECK(extra_seat_price_cents>=0),
  monthly_ticket_limit integer, storage_limit_mb integer,
  features jsonb NOT NULL DEFAULT '{}'::jsonb, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.saas_plans(code,name,monthly_price_cents,included_seats,extra_seat_price_cents,monthly_ticket_limit,storage_limit_mb,features) VALUES
 ('START','SAC Start',44900,5,7900,500,5120,'{"dashboard":true,"attachments":true,"sla":true}'),
 ('PRO','SAC Profissional',107900,15,6900,3000,25600,'{"dashboard":true,"attachments":true,"sla":true,"api":true,"custom_branding":true}'),
 ('ENTERPRISE','SAC Enterprise',224900,40,5900,NULL,102400,'{"dashboard":true,"attachments":true,"sla":true,"api":true,"sso":true,"audit_export":true}')
ON CONFLICT(code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.tenant_subscriptions(
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.saas_plans(id),
  status text NOT NULL DEFAULT 'TRIAL' CHECK(status IN('TRIAL','ACTIVE','PAST_DUE','SUSPENDED','CANCELED')),
  seat_limit integer CHECK(seat_limit IS NULL OR seat_limit>0), trial_ends_at timestamptz,
  current_period_start timestamptz NOT NULL DEFAULT now(), current_period_end timestamptz NOT NULL DEFAULT(now()+interval '1 month'),
  billing_email text, provider text, provider_customer_id text, provider_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.usage_events(
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK(event_type IN('USER_ACTIVE','TICKET_CREATED','OS_CREATED','ATTACHMENT_UPLOADED','AI_REQUEST','STORAGE_BYTES')),
  quantity bigint NOT NULL DEFAULT 1 CHECK(quantity>=0), entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb, occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_usage_events_billing ON public.usage_events(tenant_id,occurred_at DESC,event_type);
CREATE UNIQUE INDEX IF NOT EXISTS uq_usage_event_entity ON public.usage_events(tenant_id,event_type,entity_id)
  WHERE entity_id IS NOT NULL AND event_type IN('TICKET_CREATED','OS_CREATED','ATTACHMENT_UPLOADED');

ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS saas_plans_read ON public.saas_plans;
CREATE POLICY saas_plans_read ON public.saas_plans FOR SELECT TO authenticated USING(is_active=true);
DROP POLICY IF EXISTS tenant_subscription_read ON public.tenant_subscriptions;
CREATE POLICY tenant_subscription_read ON public.tenant_subscriptions FOR SELECT TO authenticated USING(tenant_id=public.user_tenant_id());
DROP POLICY IF EXISTS usage_events_read ON public.usage_events;
CREATE POLICY usage_events_read ON public.usage_events FOR SELECT TO authenticated
  USING(tenant_id=public.user_tenant_id() AND public.user_role_code() IN('SUPERADMIN','ADMIN_EMPRESA','DIRETORIA'));
REVOKE ALL ON public.tenant_subscriptions,public.usage_events FROM anon;
REVOKE INSERT,UPDATE,DELETE ON public.saas_plans,public.tenant_subscriptions,public.usage_events FROM authenticated;

-- O cliente atual entra em trial sem interromper a operacao.
INSERT INTO public.tenant_subscriptions(tenant_id,plan_id,status,trial_ends_at,current_period_end)
SELECT t.id,p.id,'TRIAL',now()+interval '30 days',now()+interval '30 days'
FROM public.tenants t CROSS JOIN LATERAL(SELECT id FROM public.saas_plans WHERE code='PRO' LIMIT 1)p
ON CONFLICT(tenant_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.subscription_usable(p_tenant uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
 SELECT EXISTS(SELECT 1 FROM public.tenant_subscriptions s WHERE s.tenant_id=p_tenant
  AND s.status IN('ACTIVE','TRIAL') AND s.current_period_end>now()
  AND(s.status<>'TRIAL' OR s.trial_ends_at IS NULL OR s.trial_ends_at>now()))
$$;
CREATE OR REPLACE FUNCTION public.subscription_seat_limit(p_tenant uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
 SELECT coalesce(s.seat_limit,p.included_seats) FROM public.tenant_subscriptions s
 JOIN public.saas_plans p ON p.id=s.plan_id WHERE s.tenant_id=p_tenant
$$;
REVOKE ALL ON FUNCTION public.subscription_usable(uuid),public.subscription_seat_limit(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.subscription_usable(uuid),public.subscription_seat_limit(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_profile_seats() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
DECLARE lim integer; used integer;
BEGIN
 IF NEW.is_active IS DISTINCT FROM true THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND OLD.is_active=true AND OLD.tenant_id=NEW.tenant_id THEN RETURN NEW; END IF;
 IF NOT public.subscription_usable(NEW.tenant_id) THEN RAISE EXCEPTION 'Assinatura inativa ou vencida.'; END IF;
 lim:=public.subscription_seat_limit(NEW.tenant_id);
 SELECT count(*) INTO used FROM public.profiles WHERE tenant_id=NEW.tenant_id AND is_active=true;
 IF lim IS NOT NULL AND used>=lim THEN RAISE EXCEPTION 'Limite de usuarios ativos do plano atingido.'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_profiles_seat_limit ON public.profiles;
CREATE TRIGGER trg_profiles_seat_limit BEFORE INSERT OR UPDATE OF tenant_id,is_active ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_seats();

-- Impede anexos e OS de apontarem para um SAC pertencente a outra empresa.
CREATE OR REPLACE FUNCTION public.assert_ticket_child_tenant() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE owner uuid;
BEGIN
 SELECT tenant_id INTO owner FROM public.tickets WHERE id=NEW.ticket_id;
 IF owner IS NULL OR NEW.tenant_id IS DISTINCT FROM owner THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Relacionamento entre empresas bloqueado.';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_ticket_attachments_tenant_guard ON public.ticket_attachments;
CREATE TRIGGER trg_ticket_attachments_tenant_guard BEFORE INSERT OR UPDATE OF tenant_id,ticket_id ON public.ticket_attachments
FOR EACH ROW EXECUTE FUNCTION public.assert_ticket_child_tenant();
DROP TRIGGER IF EXISTS trg_service_orders_tenant_guard ON public.service_orders;
CREATE TRIGGER trg_service_orders_tenant_guard BEFORE INSERT OR UPDATE OF tenant_id,ticket_id ON public.service_orders
FOR EACH ROW EXECUTE FUNCTION public.assert_ticket_child_tenant();

-- Views gerenciais devem respeitar RLS do usuario que consulta, nao o dono da view.
DO $$ BEGIN
 IF to_regclass('public.management_ticket_metrics') IS NOT NULL THEN
  EXECUTE 'ALTER VIEW public.management_ticket_metrics SET (security_invoker=true)';
 END IF;
 IF to_regclass('public.management_supplier_metrics') IS NOT NULL THEN
  EXECUTE 'ALTER VIEW public.management_supplier_metrics SET (security_invoker=true)';
 END IF;
END $$;

-- Funcoes administrativas existentes nao ficam acessiveis a anonimos.
REVOKE ALL ON FUNCTION public.reset_operational_sac_data() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.import_historical_sac(jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.delete_ticket_controlled(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.delete_service_order_controlled(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reset_operational_sac_data(),public.import_historical_sac(jsonb),
 public.delete_ticket_controlled(uuid,text),public.delete_service_order_controlled(uuid,text) TO authenticated;

-- Fecha IDOR das funcoes que antes aceitavam qualquer tenant_id informado pela tela.
CREATE OR REPLACE FUNCTION public.generate_ticket_protocol(p_tenant_id uuid) RETURNS varchar
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
DECLARE tenant uuid; ym text:=to_char(now(),'YYMM'); mx integer; nxt integer;
BEGIN
 tenant:=public.user_tenant_id();
 IF auth.uid() IS NULL OR tenant IS NULL OR p_tenant_id IS DISTINCT FROM tenant THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Empresa nao autorizada.'; END IF;
 IF NOT public.subscription_usable(tenant) THEN RAISE EXCEPTION 'Assinatura inativa ou vencida.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(tenant::text||ym));
 SELECT coalesce(max(CASE WHEN protocol~('^SAC\.'||ym||'[0-9]+$') THEN substring(protocol FROM length('SAC.'||ym)+1)::int
  WHEN protocol~('^SAC\.'||ym||'\.[0-9]+$') THEN(regexp_match(protocol,'^SAC\.'||ym||'\.([0-9]+)$'))[1]::int END),0)
 INTO mx FROM public.tickets WHERE tenant_id=tenant;
 INSERT INTO public.ticket_sequences(tenant_id,year_month,last_value) VALUES(tenant,ym,mx+1)
 ON CONFLICT(tenant_id,year_month) DO UPDATE SET last_value=greatest(public.ticket_sequences.last_value,mx)+1 RETURNING last_value INTO nxt;
 RETURN 'SAC.'||ym||lpad(nxt::text,3,'0');
END $$;
CREATE OR REPLACE FUNCTION public.generate_service_order_number(p_tenant_id uuid) RETURNS varchar
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
DECLARE tenant uuid; yr text:=to_char(now(),'YYYY'); nxt integer;
BEGIN
 tenant:=public.user_tenant_id();
 IF auth.uid() IS NULL OR tenant IS NULL OR p_tenant_id IS DISTINCT FROM tenant THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Empresa nao autorizada.'; END IF;
 IF NOT public.subscription_usable(tenant) THEN RAISE EXCEPTION 'Assinatura inativa ou vencida.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('OS'||tenant::text||yr));
 SELECT coalesce(max((regexp_match(os_number,'^OS-'||yr||'-([0-9]+)$'))[1]::int),0)+1 INTO nxt
 FROM public.service_orders WHERE tenant_id=tenant AND os_number~('^OS-'||yr||'-[0-9]+$');
 RETURN 'OS-'||yr||'-'||lpad(nxt::text,4,'0');
END $$;
REVOKE ALL ON FUNCTION public.generate_ticket_protocol(uuid),public.generate_service_order_number(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.generate_ticket_protocol(uuid),public.generate_service_order_number(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_saas_usage() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
DECLARE event text;
BEGIN
 event:=CASE TG_TABLE_NAME WHEN 'tickets' THEN 'TICKET_CREATED' WHEN 'service_orders' THEN 'OS_CREATED' WHEN 'ticket_attachments' THEN 'ATTACHMENT_UPLOADED' END;
 INSERT INTO public.usage_events(tenant_id,user_id,event_type,entity_id,metadata)
 VALUES(NEW.tenant_id,auth.uid(),event,NEW.id,jsonb_build_object('source_table',TG_TABLE_NAME)) ON CONFLICT DO NOTHING;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_tickets_usage ON public.tickets;
CREATE TRIGGER trg_tickets_usage AFTER INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.record_saas_usage();
DROP TRIGGER IF EXISTS trg_service_orders_usage ON public.service_orders;
CREATE TRIGGER trg_service_orders_usage AFTER INSERT ON public.service_orders FOR EACH ROW EXECUTE FUNCTION public.record_saas_usage();
DROP TRIGGER IF EXISTS trg_ticket_attachments_usage ON public.ticket_attachments;
CREATE TRIGGER trg_ticket_attachments_usage AFTER INSERT ON public.ticket_attachments FOR EACH ROW EXECUTE FUNCTION public.record_saas_usage();
