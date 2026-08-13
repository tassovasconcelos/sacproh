

-- Validade explícita por lote e follow-up técnico com fabricantes.
ALTER TABLE product_lots
  ADD COLUMN IF NOT EXISTS expiration_mode VARCHAR(20) NOT NULL DEFAULT 'NOT_INFORMED'
    CHECK (expiration_mode IN ('DETERMINED','INDETERMINATE','NOT_INFORMED'));

UPDATE product_lots
SET expiration_mode = CASE
  WHEN expiration_date IS NOT NULL THEN 'DETERMINED'
  ELSE 'NOT_INFORMED'
END
WHERE expiration_mode = 'NOT_INFORMED';

ALTER TABLE product_lots
  DROP CONSTRAINT IF EXISTS product_lots_expiration_consistency;
ALTER TABLE product_lots
  ADD CONSTRAINT product_lots_expiration_consistency CHECK (
    (expiration_mode = 'DETERMINED' AND expiration_date IS NOT NULL)
    OR (expiration_mode IN ('INDETERMINATE','NOT_INFORMED') AND expiration_date IS NULL)
  );

CREATE TABLE IF NOT EXISTS factory_followups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_lot_id UUID NOT NULL REFERENCES product_lots(id) ON DELETE CASCADE,
  manufacturer_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  subject VARCHAR(255) NOT NULL,
  problem_summary TEXT NOT NULL CHECK (length(trim(problem_summary)) >= 10),
  requested_repair TEXT,
  requested_improvement TEXT,
  requested_parts TEXT,
  replacement_quantity INTEGER NOT NULL DEFAULT 0 CHECK (replacement_quantity >= 0),
  protocol_reference VARCHAR(120),
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','SENT','ACKNOWLEDGED','IN_ANALYSIS','PARTS_SENT','REPAIR_IN_PROGRESS','COMPLETED','CANCELLED')),
  owner_name VARCHAR(255) NOT NULL,
  due_date DATE,
  last_contact_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  manufacturer_response TEXT,
  created_by UUID REFERENCES profiles(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS factory_followups_tenant_status_idx
  ON factory_followups (tenant_id, status, next_followup_at);
CREATE INDEX IF NOT EXISTS factory_followups_lot_idx
  ON factory_followups (product_lot_id, created_at DESC);

ALTER TABLE factory_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY factory_followups_tenant_read ON factory_followups
  FOR SELECT TO authenticated
  USING (tenant_id = user_tenant_id() OR user_role_code() = 'SUPERADMIN');

CREATE POLICY factory_followups_controlled_insert ON factory_followups
  FOR INSERT TO authenticated
  WITH CHECK (
    (tenant_id = user_tenant_id() OR user_role_code() = 'SUPERADMIN')
    AND user_role_code() IN ('SUPERADMIN','DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA','TECNICO')
  );

CREATE POLICY factory_followups_controlled_update ON factory_followups
  FOR UPDATE TO authenticated
  USING (
    (tenant_id = user_tenant_id() OR user_role_code() = 'SUPERADMIN')
    AND user_role_code() IN ('SUPERADMIN','DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA','TECNICO')
  )
  WITH CHECK (
    (tenant_id = user_tenant_id() OR user_role_code() = 'SUPERADMIN')
    AND user_role_code() IN ('SUPERADMIN','DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA','TECNICO')
  );

GRANT SELECT, INSERT, UPDATE ON factory_followups TO authenticated;

CREATE OR REPLACE VIEW management_product_lot_indicators WITH (security_invoker=true) AS
SELECT
  pl.tenant_id,
  pl.product_id,
  p.name AS product_name,
  p.code_sku,
  p.manufacturer_name,
  pl.id AS product_lot_id,
  pl.lot_number,
  pl.expiration_mode,
  pl.expiration_date,
  pl.status AS lot_status,
  pl.sold_quantity,
  COUNT(DISTINCT t.id) AS complaint_count,
  COUNT(DISTINCT t.customer_id) AS affected_customer_count,
  COUNT(DISTINCT NULLIF(COALESCE(t.subcategory,t.category),'')) AS distinct_defect_count,
  COUNT(DISTINCT ff.id) FILTER (WHERE ff.status NOT IN ('COMPLETED','CANCELLED')) AS open_factory_followups,
  COALESCE(SUM(ff.replacement_quantity) FILTER (WHERE ff.status NOT IN ('CANCELLED')),0) AS requested_replacements,
  CASE WHEN pl.sold_quantity > 0
    THEN ROUND((COUNT(DISTINCT t.id)::NUMERIC / pl.sold_quantity) * 1000, 2)
    ELSE NULL END AS complaints_per_thousand
FROM product_lots pl
JOIN products p ON p.id = pl.product_id AND p.tenant_id = pl.tenant_id
LEFT JOIN ticket_items ti ON ti.product_id = pl.product_id AND ti.lot_number = pl.lot_number
LEFT JOIN tickets t ON t.id = ti.ticket_id AND t.tenant_id = pl.tenant_id
LEFT JOIN factory_followups ff ON ff.product_lot_id = pl.id AND ff.tenant_id = pl.tenant_id
GROUP BY pl.id,p.id;

GRANT SELECT ON management_product_lot_indicators TO authenticated;



