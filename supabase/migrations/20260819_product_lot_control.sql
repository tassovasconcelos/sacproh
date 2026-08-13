-- Controle operacional de lotes, exposição e ações preventivas.
CREATE TABLE IF NOT EXISTS product_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  lot_number VARCHAR(100) NOT NULL,
  manufacturing_date DATE,
  expiration_date DATE,
  received_quantity INTEGER NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  sold_quantity INTEGER NOT NULL DEFAULT 0 CHECK (sold_quantity >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'RELEASED'
    CHECK (status IN ('RELEASED','QUARANTINE','BLOCKED','RECALL','EXHAUSTED')),
  supplier_document VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, product_id, lot_number)
);

CREATE INDEX IF NOT EXISTS product_lots_tenant_status_idx ON product_lots (tenant_id,status);
CREATE INDEX IF NOT EXISTS product_lots_expiration_idx ON product_lots (expiration_date) WHERE expiration_date IS NOT NULL;

ALTER TABLE product_lots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_lots_tenant_access ON product_lots;
CREATE POLICY product_lots_tenant_read ON product_lots
  FOR SELECT TO authenticated
  USING (tenant_id = user_tenant_id() OR user_role_code() = 'SUPERADMIN');

CREATE POLICY product_lots_controlled_write ON product_lots
  FOR ALL TO authenticated
  USING (
    (tenant_id = user_tenant_id() OR user_role_code() = 'SUPERADMIN')
    AND user_role_code() IN ('SUPERADMIN','DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA')
  )
  WITH CHECK (
    (tenant_id = user_tenant_id() OR user_role_code() = 'SUPERADMIN')
    AND user_role_code() IN ('SUPERADMIN','DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA')
  );

GRANT SELECT,INSERT,UPDATE ON product_lots TO authenticated;

CREATE OR REPLACE VIEW management_lot_metrics WITH (security_invoker=true) AS
SELECT
  pl.tenant_id, pl.product_id, pl.id AS lot_id, pl.lot_number, pl.status,
  pl.expiration_date, pl.received_quantity, pl.sold_quantity, pl.stock_quantity,
  COUNT(DISTINCT ti.ticket_id) AS complaint_count,
  COUNT(DISTINCT t.customer_id) AS affected_customer_count,
  CASE WHEN pl.sold_quantity > 0
    THEN ROUND((COUNT(DISTINCT ti.ticket_id)::NUMERIC / pl.sold_quantity) * 1000, 2)
    ELSE NULL END AS complaints_per_thousand
FROM product_lots pl
LEFT JOIN ticket_items ti ON ti.product_id = pl.product_id AND ti.lot_number = pl.lot_number
LEFT JOIN tickets t ON t.id = ti.ticket_id AND t.tenant_id = pl.tenant_id
GROUP BY pl.id;

GRANT SELECT ON management_lot_metrics TO authenticated;
