-- GRIT SAC 4.0 - controles empresariais, documentos, SLA e relatórios

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('SUPPLIER', 'MANUFACTURER', 'BOTH')),
  legal_name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255),
  document VARCHAR(30),
  country VARCHAR(100) DEFAULT 'Brasil',
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  quality_email VARCHAR(255),
  anvisa_authorization VARCHAR(100),
  qualification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    CHECK (qualification_status IN ('PENDING', 'QUALIFIED', 'SUSPENDED', 'REJECTED')),
  qualification_expires_at DATE,
  score NUMERIC(5,2) CHECK (score BETWEEN 0 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, document)
);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id),
  ADD COLUMN IF NOT EXISTS manufacturer_id UUID REFERENCES suppliers(id);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  supplier_id UUID REFERENCES suppliers(id),
  number VARCHAR(100) NOT NULL,
  series VARCHAR(30),
  access_key VARCHAR(60),
  issued_at DATE,
  total_amount NUMERIC(14,2) DEFAULT 0,
  file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, number, series)
);

CREATE TABLE IF NOT EXISTS ticket_invoices (
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  relationship VARCHAR(20) NOT NULL DEFAULT 'SALE'
    CHECK (relationship IN ('SALE', 'RETURN', 'REPLACEMENT', 'SERVICE')),
  PRIMARY KEY (ticket_id, invoice_id)
);

CREATE TABLE IF NOT EXISTS service_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  os_number VARCHAR(40) NOT NULL,
  technician_id UUID REFERENCES profiles(id),
  service_type VARCHAR(40) NOT NULL,
  equipment_name VARCHAR(255) NOT NULL,
  serial_number VARCHAR(100),
  diagnostic TEXT,
  performed_service TEXT,
  parts_replaced TEXT,
  estimated_cost NUMERIC(12,2) DEFAULT 0,
  final_cost NUMERIC(12,2) DEFAULT 0,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  customer_signature_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
  UNIQUE (tenant_id, os_number)
);

CREATE TABLE IF NOT EXISTS sla_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category VARCHAR(100),
  priority VARCHAR(20) NOT NULL,
  first_response_minutes INT NOT NULL CHECK (first_response_minutes > 0),
  resolution_minutes INT NOT NULL CHECK (resolution_minutes > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (tenant_id, category, priority)
);

CREATE INDEX IF NOT EXISTS idx_tickets_tenant_created ON tickets(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_status ON tickets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_sla_due ON tickets(tenant_id, sla_due_at) WHERE closed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_attachments_ticket ON ticket_attachments(ticket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_created ON audit_logs(tenant_id, created_at DESC);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_policies ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION user_tenant_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid() AND is_active = TRUE
$$;

CREATE OR REPLACE FUNCTION user_role_code()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role_code FROM profiles WHERE id = auth.uid() AND is_active = TRUE
$$;

CREATE POLICY suppliers_tenant_policy ON suppliers
  FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id())
  WITH CHECK (tenant_id = user_tenant_id());

CREATE POLICY invoices_tenant_policy ON invoices
  FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id())
  WITH CHECK (tenant_id = user_tenant_id());

CREATE POLICY service_orders_tenant_policy ON service_orders
  FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id())
  WITH CHECK (tenant_id = user_tenant_id());

CREATE POLICY sla_policies_read ON sla_policies
  FOR SELECT TO authenticated
  USING (tenant_id = user_tenant_id());

CREATE POLICY sla_policies_admin_write ON sla_policies
  FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id() AND user_role_code() IN ('SUPERADMIN','DIRETORIA','ADMIN_EMPRESA'))
  WITH CHECK (tenant_id = user_tenant_id() AND user_role_code() IN ('SUPERADMIN','DIRETORIA','ADMIN_EMPRESA'));

CREATE POLICY ticket_invoices_tenant_policy ON ticket_invoices
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_invoices.ticket_id AND t.tenant_id = user_tenant_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_invoices.ticket_id AND t.tenant_id = user_tenant_id()
  ));

CREATE OR REPLACE VIEW management_ticket_metrics AS
SELECT
  tenant_id,
  date_trunc('month', created_at) AS month,
  category,
  priority,
  status,
  COUNT(*) AS ticket_count,
  COUNT(*) FILTER (WHERE closed_at IS NOT NULL) AS closed_count,
  COUNT(*) FILTER (WHERE sla_due_at IS NOT NULL AND COALESCE(closed_at, NOW()) <= sla_due_at) AS within_sla_count,
  AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60)
    FILTER (WHERE first_response_at IS NOT NULL) AS avg_first_response_minutes,
  AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 3600)
    FILTER (WHERE closed_at IS NOT NULL) AS avg_resolution_hours
FROM tickets
GROUP BY tenant_id, date_trunc('month', created_at), category, priority, status;

CREATE OR REPLACE VIEW management_supplier_metrics AS
SELECT
  p.tenant_id,
  COALESCE(p.manufacturer_id, p.supplier_id) AS partner_id,
  COUNT(DISTINCT ti.ticket_id) AS related_tickets,
  COUNT(DISTINCT ti.ticket_id) FILTER (WHERE t.final_procedency = 'PROCEDENT') AS procedent_tickets
FROM products p
LEFT JOIN ticket_items ti ON ti.product_id = p.id
LEFT JOIN tickets t ON t.id = ti.ticket_id
GROUP BY p.tenant_id, COALESCE(p.manufacturer_id, p.supplier_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sac-attachments',
  'sac-attachments',
  FALSE,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY sac_attachments_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'sac-attachments'
    AND (storage.foldername(name))[1] = user_tenant_id()::text
  );

CREATE POLICY sac_attachments_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'sac-attachments'
    AND (storage.foldername(name))[1] = user_tenant_id()::text
  );
