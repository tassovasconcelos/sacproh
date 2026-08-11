-- Central gerencial: telemetria funcional, agregados e histórico de versões.
CREATE TABLE IF NOT EXISTS public.platform_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area text NOT NULL CHECK (area ~ '^[a-z0-9_-]{1,60}$'),
  event_type text NOT NULL DEFAULT 'AREA_VIEW' CHECK (event_type IN ('SESSION_START','AREA_VIEW','RECORD_CREATED','RECORD_UPDATED')),
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_tenant_time ON public.platform_usage_events(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_user_time ON public.platform_usage_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_area_time ON public.platform_usage_events(area, occurred_at DESC);
ALTER TABLE public.platform_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usage_insert_own ON public.platform_usage_events;
CREATE POLICY usage_insert_own ON public.platform_usage_events FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS usage_read_tenant_admin ON public.platform_usage_events;
CREATE POLICY usage_read_tenant_admin ON public.platform_usage_events FOR SELECT TO authenticated
USING (tenant_id = public.current_tenant_id() AND public.current_role_code() IN ('SUPERADMIN','ADMIN_EMPRESA','DIRETORIA'));

CREATE TABLE IF NOT EXISTS public.product_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text NOT NULL,
  improvements jsonb NOT NULL DEFAULT '[]'::jsonb,
  published_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_releases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS releases_authenticated_read ON public.product_releases;
CREATE POLICY releases_authenticated_read ON public.product_releases FOR SELECT TO authenticated USING (true);

INSERT INTO public.product_releases(version,title,summary,improvements)
VALUES ('4.1.0','SAC 4.0 — Gestão, rastreabilidade e engajamento','Consolidação comercial e gerencial do SAC 4.0, mantendo todos os processos existentes.',
  '["Central gerencial multiempresa","Trials de 15 dias e gestão de assinaturas","Mercado Pago com conciliação e alertas","Identidade visual por cliente","Inteligência de lote, validade e recall","Filtros por empresa e usuário","Edição, bloqueio e recuperação de acesso","Métricas de acessos, áreas e registros","Auditoria administrativa e segurança multiempresa"]'::jsonb)
ON CONFLICT (version) DO UPDATE SET title=EXCLUDED.title,summary=EXCLUDED.summary,improvements=EXCLUDED.improvements,published_at=now();

REVOKE ALL ON public.platform_usage_events, public.product_releases FROM anon;
GRANT SELECT,INSERT ON public.platform_usage_events TO authenticated;
GRANT SELECT ON public.product_releases TO authenticated;
