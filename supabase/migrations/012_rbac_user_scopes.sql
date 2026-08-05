-- Escopo efetivo de acesso: próprios registros, unidade ou empresa.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS access_scope VARCHAR(10) NOT NULL DEFAULT 'TENANT'
  CHECK (access_scope IN ('OWN','UNIT','TENANT'));
UPDATE profiles SET access_scope='OWN' WHERE role_code='GERENTE_LOJA' AND access_scope='TENANT';

CREATE OR REPLACE FUNCTION user_access_scope() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT access_scope FROM profiles WHERE id=auth.uid() AND is_active=TRUE
$$;
CREATE OR REPLACE FUNCTION user_unit_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT unit_id FROM profiles WHERE id=auth.uid() AND is_active=TRUE
$$;

CREATE OR REPLACE FUNCTION can_access_ticket_values(
  p_tenant UUID,p_unit UUID,p_created_by UUID,p_assigned_to UUID,p_assigned_area TEXT
) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT p_tenant=user_tenant_id() AND CASE
    WHEN user_role_code() IN ('SUPERADMIN','ADMIN_EMPRESA','DIRETORIA','RESPONSAVEL_TECNICA','SAC') THEN TRUE
    WHEN user_role_code()='GERENTE_LOJA' AND user_access_scope()='OWN' THEN p_created_by=auth.uid()
    WHEN user_role_code()='GERENTE_LOJA' AND user_access_scope()='UNIT' THEN p_unit IS NOT NULL AND p_unit=user_unit_id()
    WHEN user_role_code()='TECNICO' THEN p_assigned_to=auth.uid() OR lower(COALESCE(p_assigned_area,'')) LIKE '%t%cnica%'
    WHEN user_role_code()='LOGISTICA' THEN p_assigned_to=auth.uid() OR lower(COALESCE(p_assigned_area,'')) LIKE '%log%stica%'
    ELSE FALSE END
$$;

CREATE OR REPLACE FUNCTION can_access_ticket(p_ticket_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM tickets t WHERE t.id=p_ticket_id
    AND can_access_ticket_values(t.tenant_id,t.unit_id,t.created_by,t.assigned_to,t.assigned_area))
$$;

REVOKE ALL ON FUNCTION user_access_scope() FROM PUBLIC;
REVOKE ALL ON FUNCTION user_unit_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION can_access_ticket_values(UUID,UUID,UUID,UUID,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_access_ticket(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION user_access_scope(),user_unit_id(),can_access_ticket(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_ticket_values(UUID,UUID,UUID,UUID,TEXT) TO authenticated;

DROP POLICY IF EXISTS tickets_tenant_read ON tickets;
DROP POLICY IF EXISTS tickets_tenant_insert ON tickets;
DROP POLICY IF EXISTS tickets_tenant_update ON tickets;
CREATE POLICY tickets_scoped_read ON tickets FOR SELECT TO authenticated
  USING (can_access_ticket_values(tenant_id,unit_id,created_by,assigned_to,assigned_area));
CREATE POLICY tickets_scoped_insert ON tickets FOR INSERT TO authenticated
  WITH CHECK (tenant_id=user_tenant_id() AND created_by=auth.uid()
    AND user_role_code() IN ('SUPERADMIN','ADMIN_EMPRESA','GERENTE_LOJA','SAC')
    AND (user_role_code()<>'GERENTE_LOJA' OR user_access_scope()='OWN' OR unit_id=user_unit_id()));
CREATE POLICY tickets_scoped_update ON tickets FOR UPDATE TO authenticated
  USING (can_access_ticket_values(tenant_id,unit_id,created_by,assigned_to,assigned_area)
    AND user_role_code() IN ('SUPERADMIN','ADMIN_EMPRESA','RESPONSAVEL_TECNICA','TECNICO','SAC','LOGISTICA'))
  WITH CHECK (tenant_id=user_tenant_id());

DROP POLICY IF EXISTS ticket_items_tenant_access ON ticket_items;
CREATE POLICY ticket_items_scoped_read ON ticket_items FOR SELECT TO authenticated USING (can_access_ticket(ticket_id));
CREATE POLICY ticket_items_scoped_insert ON ticket_items FOR INSERT TO authenticated
  WITH CHECK (can_access_ticket(ticket_id) AND user_role_code() IN ('SUPERADMIN','ADMIN_EMPRESA','GERENTE_LOJA','SAC'));
CREATE POLICY ticket_items_scoped_update ON ticket_items FOR UPDATE TO authenticated
  USING (can_access_ticket(ticket_id) AND user_role_code() IN ('SUPERADMIN','ADMIN_EMPRESA','SAC'))
  WITH CHECK (can_access_ticket(ticket_id));

DROP POLICY IF EXISTS ticket_comments_tenant_access ON ticket_comments;
CREATE POLICY ticket_comments_scoped_read ON ticket_comments FOR SELECT TO authenticated USING (can_access_ticket(ticket_id));
CREATE POLICY ticket_comments_scoped_insert ON ticket_comments FOR INSERT TO authenticated
  WITH CHECK (can_access_ticket(ticket_id) AND author_id=auth.uid());

DROP POLICY IF EXISTS ticket_history_tenant_access ON ticket_status_history;
CREATE POLICY ticket_history_scoped_read ON ticket_status_history FOR SELECT TO authenticated USING (can_access_ticket(ticket_id));
CREATE POLICY ticket_history_scoped_insert ON ticket_status_history FOR INSERT TO authenticated
  WITH CHECK (can_access_ticket(ticket_id) AND changed_by=auth.uid());

DROP POLICY IF EXISTS ticket_attachments_tenant_access ON ticket_attachments;
CREATE POLICY ticket_attachments_scoped_read ON ticket_attachments FOR SELECT TO authenticated USING (can_access_ticket(ticket_id));
CREATE POLICY ticket_attachments_scoped_insert ON ticket_attachments FOR INSERT TO authenticated
  WITH CHECK (tenant_id=user_tenant_id() AND can_access_ticket(ticket_id) AND uploaded_by=auth.uid());

DROP POLICY IF EXISTS technical_cases_tenant_access ON technical_cases;
CREATE POLICY technical_cases_scoped_read ON technical_cases FOR SELECT TO authenticated USING (can_access_ticket(ticket_id));
CREATE POLICY technical_cases_scoped_write ON technical_cases FOR ALL TO authenticated
  USING (can_access_ticket(ticket_id) AND user_role_code() IN ('SUPERADMIN','ADMIN_EMPRESA','RESPONSAVEL_TECNICA','TECNICO'))
  WITH CHECK (can_access_ticket(ticket_id) AND user_role_code() IN ('SUPERADMIN','ADMIN_EMPRESA','RESPONSAVEL_TECNICA','TECNICO'));

DROP POLICY IF EXISTS logistics_cases_tenant_access ON logistics_cases;
CREATE POLICY logistics_cases_scoped_read ON logistics_cases FOR SELECT TO authenticated USING (can_access_ticket(ticket_id));
CREATE POLICY logistics_cases_scoped_write ON logistics_cases FOR ALL TO authenticated
  USING (can_access_ticket(ticket_id) AND user_role_code() IN ('SUPERADMIN','ADMIN_EMPRESA','LOGISTICA'))
  WITH CHECK (can_access_ticket(ticket_id) AND user_role_code() IN ('SUPERADMIN','ADMIN_EMPRESA','LOGISTICA'));

INSERT INTO permissions(code,module,description) VALUES
 ('TICKET_CREATE','TICKETS','Abrir chamados'),('TICKET_READ_OWN','TICKETS','Consultar chamados próprios'),
 ('TICKET_READ_UNIT','TICKETS','Consultar chamados da unidade'),('TICKET_READ_TENANT','TICKETS','Consultar chamados da empresa'),
 ('TICKET_TRIAGE','TICKETS','Editar e encaminhar triagem'),('TECHNICAL_WRITE','TECHNICAL','Registrar laudos e OS'),
 ('LOGISTICS_WRITE','LOGISTICS','Registrar coleta e transporte'),('QUALITY_WRITE','QUALITY','Registrar parecer e plano de ação'),
 ('REPORTS_READ','REPORTS','Consultar relatórios'),('USERS_MANAGE','SETTINGS','Administrar usuários')
ON CONFLICT(code) DO UPDATE SET module=EXCLUDED.module,description=EXCLUDED.description;

INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON
 (r.code='GERENTE_LOJA' AND p.code IN ('TICKET_CREATE','TICKET_READ_OWN','TICKET_READ_UNIT')) OR
 (r.code='SAC' AND p.code IN ('TICKET_CREATE','TICKET_READ_TENANT','TICKET_TRIAGE','REPORTS_READ')) OR
 (r.code='TECNICO' AND p.code IN ('TICKET_READ_TENANT','TECHNICAL_WRITE')) OR
 (r.code='LOGISTICA' AND p.code IN ('TICKET_READ_TENANT','LOGISTICS_WRITE')) OR
 (r.code='RESPONSAVEL_TECNICA' AND p.code IN ('TICKET_READ_TENANT','TECHNICAL_WRITE','QUALITY_WRITE','REPORTS_READ')) OR
 (r.code='DIRETORIA' AND p.code IN ('TICKET_READ_TENANT','REPORTS_READ')) OR
 (r.code IN ('SUPERADMIN','ADMIN_EMPRESA'))
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_tickets_creator_created ON tickets(tenant_id,created_by,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_unit_created ON tickets(tenant_id,unit_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_created ON tickets(tenant_id,assigned_to,created_at DESC);
