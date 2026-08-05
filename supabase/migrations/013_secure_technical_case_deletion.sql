-- Subprotocolos técnicos reais, com leitura pelo escopo do SAC e exclusão restrita.
DROP POLICY IF EXISTS technical_cases_tenant_access ON technical_cases;
DROP POLICY IF EXISTS technical_cases_scoped_read ON technical_cases;
DROP POLICY IF EXISTS technical_cases_scoped_write ON technical_cases;
DROP POLICY IF EXISTS technical_cases_scoped_insert ON technical_cases;
DROP POLICY IF EXISTS technical_cases_scoped_update ON technical_cases;
DROP POLICY IF EXISTS technical_cases_scoped_delete ON technical_cases;

CREATE POLICY technical_cases_scoped_read ON technical_cases FOR SELECT TO authenticated
  USING (can_access_ticket(ticket_id));

CREATE POLICY technical_cases_scoped_insert ON technical_cases FOR INSERT TO authenticated
  WITH CHECK (can_access_ticket(ticket_id)
    AND user_role_code() IN ('SUPERADMIN','ADMIN_EMPRESA','RESPONSAVEL_TECNICA','TECNICO'));

CREATE POLICY technical_cases_scoped_update ON technical_cases FOR UPDATE TO authenticated
  USING (can_access_ticket(ticket_id)
    AND user_role_code() IN ('SUPERADMIN','ADMIN_EMPRESA','RESPONSAVEL_TECNICA','TECNICO'))
  WITH CHECK (can_access_ticket(ticket_id));

CREATE POLICY technical_cases_scoped_delete ON technical_cases FOR DELETE TO authenticated
  USING (can_access_ticket(ticket_id)
    AND user_role_code() IN ('SUPERADMIN','ADMIN_EMPRESA','RESPONSAVEL_TECNICA','TECNICO'));

CREATE INDEX IF NOT EXISTS idx_technical_cases_ticket_created
  ON technical_cases(ticket_id,created_at DESC);
