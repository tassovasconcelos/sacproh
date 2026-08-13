-- Relatórios regulatórios exclusivos do Responsável Técnico.
CREATE TABLE IF NOT EXISTS public.product_regulatory_compliance (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  udi_di text,
  anvisa_registration text,
  anvisa_expiration date,
  inmetro_required boolean NOT NULL DEFAULT false,
  inmetro_registration text,
  certificate_number text,
  certificate_expiration date,
  certification_body text,
  applicable_standard text,
  notes text,
  updated_by uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.regulatory_report_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('ANVISA','INMETRO')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  title text NOT NULL,
  summary jsonb NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','REVIEWED','SUBMITTED')),
  protocol_reference text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_regulatory_reports_tenant_period ON public.regulatory_report_snapshots(tenant_id,period_end DESC);
ALTER TABLE public.product_regulatory_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_report_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS regulatory_compliance_rt_only ON public.product_regulatory_compliance;
CREATE POLICY regulatory_compliance_rt_only ON public.product_regulatory_compliance FOR ALL TO authenticated
USING (tenant_id=public.user_tenant_id() AND public.user_role_code()='RESPONSAVEL_TECNICA')
WITH CHECK (tenant_id=public.user_tenant_id() AND public.user_role_code()='RESPONSAVEL_TECNICA' AND updated_by=auth.uid());

DROP POLICY IF EXISTS regulatory_reports_rt_only ON public.regulatory_report_snapshots;
CREATE POLICY regulatory_reports_rt_only ON public.regulatory_report_snapshots FOR ALL TO authenticated
USING (tenant_id=public.user_tenant_id() AND public.user_role_code()='RESPONSAVEL_TECNICA')
WITH CHECK (tenant_id=public.user_tenant_id() AND public.user_role_code()='RESPONSAVEL_TECNICA' AND created_by=auth.uid());

REVOKE ALL ON public.product_regulatory_compliance,public.regulatory_report_snapshots FROM anon;
GRANT SELECT,INSERT,UPDATE ON public.product_regulatory_compliance,public.regulatory_report_snapshots TO authenticated;
