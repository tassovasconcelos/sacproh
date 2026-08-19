-- GRIT SAC 4.0: reparo operacional de tenant, telemetria e protocolo continuo.
-- Aplicado em producao em 2026-08-19 e versionado aqui para eliminar drift.

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT tenant_id
  FROM public.profiles
  WHERE id = auth.uid() AND is_active = true
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_tenant_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated;

DROP POLICY IF EXISTS usage_insert_own ON public.platform_usage_events;
CREATE POLICY usage_insert_own ON public.platform_usage_events
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND tenant_id = public.user_tenant_id()
);

DROP POLICY IF EXISTS usage_read_tenant_admin ON public.platform_usage_events;
CREATE POLICY usage_read_tenant_admin ON public.platform_usage_events
FOR SELECT TO authenticated
USING (
  tenant_id = public.user_tenant_id()
  AND public.user_role_code() IN ('SUPERADMIN','ADMIN_EMPRESA','DIRETORIA')
);

CREATE OR REPLACE FUNCTION public.generate_ticket_protocol(p_tenant_id uuid)
RETURNS varchar
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
DECLARE
  v_tenant uuid;
  v_ym text := to_char(now(), 'YYMM');
  v_existing_max integer := 0;
  v_saved_max integer := 0;
  v_next integer;
BEGIN
  v_tenant := public.user_tenant_id();

  IF auth.uid() IS NULL OR v_tenant IS NULL OR p_tenant_id IS DISTINCT FROM v_tenant THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Empresa nao autorizada.';
  END IF;

  IF NOT public.subscription_usable(v_tenant) THEN
    RAISE EXCEPTION 'Assinatura inativa ou vencida.';
  END IF;

  -- Um unico lock por empresa preserva a numeracao inclusive na virada do mes.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_tenant::text || ':ticket-protocol', 0));

  SELECT COALESCE(MAX(
    CASE
      WHEN protocol ~ '^SAC\.[0-9]{4}[0-9]+$' THEN substring(protocol FROM 9)::integer
      WHEN protocol ~ '^SAC\.[0-9]{4}\.[0-9]+$' THEN (regexp_match(protocol, '^SAC\.[0-9]{4}\.([0-9]+)$'))[1]::integer
      ELSE NULL
    END
  ), 0)
  INTO v_existing_max
  FROM public.tickets
  WHERE tenant_id = v_tenant;

  SELECT COALESCE(MAX(last_value), 0)
  INTO v_saved_max
  FROM public.ticket_sequences
  WHERE tenant_id = v_tenant;

  v_next := GREATEST(v_existing_max, v_saved_max) + 1;

  INSERT INTO public.ticket_sequences(tenant_id, year_month, last_value)
  VALUES(v_tenant, v_ym, v_next)
  ON CONFLICT(tenant_id, year_month) DO UPDATE
  SET last_value = GREATEST(public.ticket_sequences.last_value, EXCLUDED.last_value);

  -- Mantem o padrao historico em uso: SAC.AAMMNNN, ex. SAC.2608270.
  RETURN 'SAC.' || v_ym || lpad(v_next::text, 3, '0');
END
$$;

REVOKE ALL ON FUNCTION public.generate_ticket_protocol(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_ticket_protocol(uuid) TO authenticated;
