-- GRIT SAC 4.0 - políticas completas de acesso multiempresa

DROP POLICY IF EXISTS tenant_isolation_tickets ON tickets;
DROP POLICY IF EXISTS tenant_isolation_customers ON customers;
DROP POLICY IF EXISTS tenant_isolation_products ON products;

CREATE POLICY tenants_read_own ON tenants
  FOR SELECT TO authenticated
  USING (id = user_tenant_id() OR user_role_code() = 'SUPERADMIN');

CREATE POLICY profiles_read_tenant ON profiles
  FOR SELECT TO authenticated
  USING (tenant_id = user_tenant_id() OR id = auth.uid() OR user_role_code() = 'SUPERADMIN');

CREATE POLICY profiles_admin_write ON profiles
  FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id() AND user_role_code() IN ('SUPERADMIN','ADMIN_EMPRESA'))
  WITH CHECK (tenant_id = user_tenant_id() AND user_role_code() IN ('SUPERADMIN','ADMIN_EMPRESA'));

CREATE POLICY roles_authenticated_read ON roles
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY permissions_authenticated_read ON permissions
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY role_permissions_authenticated_read ON role_permissions
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY units_tenant_access ON units
  FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id())
  WITH CHECK (tenant_id = user_tenant_id());

CREATE POLICY customers_tenant_access ON customers
  FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id())
  WITH CHECK (tenant_id = user_tenant_id());

CREATE POLICY product_families_tenant_access ON product_families
  FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id())
  WITH CHECK (tenant_id = user_tenant_id());

CREATE POLICY products_tenant_access ON products
  FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id())
  WITH CHECK (tenant_id = user_tenant_id());

CREATE POLICY tickets_tenant_access ON tickets
  FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id())
  WITH CHECK (tenant_id = user_tenant_id());

CREATE POLICY ticket_sequences_tenant_access ON ticket_sequences
  FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id())
  WITH CHECK (tenant_id = user_tenant_id());

CREATE POLICY ticket_items_tenant_access ON ticket_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = ticket_items.ticket_id AND t.tenant_id = user_tenant_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = ticket_items.ticket_id AND t.tenant_id = user_tenant_id()
  ));

CREATE POLICY ticket_history_tenant_access ON ticket_status_history
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = ticket_status_history.ticket_id AND t.tenant_id = user_tenant_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = ticket_status_history.ticket_id AND t.tenant_id = user_tenant_id()
  ));

CREATE POLICY ticket_comments_tenant_access ON ticket_comments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = ticket_comments.ticket_id AND t.tenant_id = user_tenant_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = ticket_comments.ticket_id AND t.tenant_id = user_tenant_id()
  ));

CREATE POLICY ticket_attachments_tenant_access ON ticket_attachments
  FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id())
  WITH CHECK (tenant_id = user_tenant_id());

CREATE POLICY root_causes_tenant_access ON root_causes
  FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id())
  WITH CHECK (tenant_id = user_tenant_id());

CREATE POLICY action_plans_tenant_access ON action_plans
  FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id())
  WITH CHECK (tenant_id = user_tenant_id());

CREATE POLICY technical_cases_tenant_access ON technical_cases
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = technical_cases.ticket_id AND t.tenant_id = user_tenant_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = technical_cases.ticket_id AND t.tenant_id = user_tenant_id()
  ));

CREATE POLICY logistics_cases_tenant_access ON logistics_cases
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = logistics_cases.ticket_id AND t.tenant_id = user_tenant_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = logistics_cases.ticket_id AND t.tenant_id = user_tenant_id()
  ));

CREATE POLICY surveys_tenant_access ON survey_responses
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = survey_responses.ticket_id AND t.tenant_id = user_tenant_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = survey_responses.ticket_id AND t.tenant_id = user_tenant_id()
  ));

CREATE POLICY audit_logs_tenant_read ON audit_logs
  FOR SELECT TO authenticated
  USING (tenant_id = user_tenant_id() AND user_role_code() IN ('SUPERADMIN','DIRETORIA','ADMIN_EMPRESA'));

CREATE POLICY audit_logs_tenant_insert ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = user_tenant_id() AND user_id = auth.uid());

GRANT SELECT ON management_ticket_metrics TO authenticated;
GRANT SELECT ON management_supplier_metrics TO authenticated;

INSERT INTO roles (code, name, description) VALUES
  ('SUPERADMIN','Superadministrador GRIT','Acesso global e gestão da plataforma'),
  ('DIRETORIA','Diretoria / Executivo','Relatórios estratégicos e aprovações'),
  ('RESPONSAVEL_TECNICA','Responsável Técnica','Qualidade, risco e parecer regulatório'),
  ('TECNICO','Técnico Especializado','Assistência técnica e ordens de serviço'),
  ('GERENTE_LOJA','Gerente de Unidade','Acompanhamento da unidade'),
  ('SAC','Pós-Venda / SAC','Abertura, triagem e relacionamento'),
  ('LOGISTICA','Logística','Coletas, devoluções e transportadoras'),
  ('ADMIN_EMPRESA','Administrador da Empresa','Usuários e parâmetros da empresa')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description;

