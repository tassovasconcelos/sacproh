-- Autoriza operações de chamados pelo perfil no banco, não apenas pela interface.
DROP POLICY IF EXISTS tickets_tenant_access ON tickets;
DROP POLICY IF EXISTS tickets_tenant_read ON tickets;
DROP POLICY IF EXISTS tickets_tenant_insert ON tickets;
DROP POLICY IF EXISTS tickets_tenant_update ON tickets;
DROP POLICY IF EXISTS tickets_tenant_delete ON tickets;

CREATE POLICY tickets_tenant_read ON tickets FOR SELECT TO authenticated
  USING (tenant_id = user_tenant_id());

CREATE POLICY tickets_tenant_insert ON tickets FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = user_tenant_id()
    AND user_role_code() IN ('SUPERADMIN','ADMIN_EMPRESA','DIRETORIA','RESPONSAVEL_TECNICA','TECNICO','SAC')
  );

CREATE POLICY tickets_tenant_update ON tickets FOR UPDATE TO authenticated
  USING (
    tenant_id = user_tenant_id()
    AND user_role_code() IN ('SUPERADMIN','ADMIN_EMPRESA','DIRETORIA','RESPONSAVEL_TECNICA','TECNICO','SAC')
  )
  WITH CHECK (tenant_id = user_tenant_id());

-- Não existe policy DELETE direta. Exclusões passam exclusivamente pela RPC auditada.
REVOKE ALL ON FUNCTION delete_ticket_controlled(UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_ticket_controlled(UUID,TEXT) TO authenticated;

DROP POLICY IF EXISTS sac_attachments_delete ON storage.objects;
CREATE POLICY sac_attachments_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'sac-attachments'
    AND (storage.foldername(name))[1] = user_tenant_id()::text
    AND user_role_code() IN ('SUPERADMIN','ADMIN_EMPRESA','DIRETORIA','RESPONSAVEL_TECNICA','TECNICO','SAC')
  );
