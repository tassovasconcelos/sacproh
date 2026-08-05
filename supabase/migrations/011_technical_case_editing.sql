ALTER TABLE technical_cases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE OR REPLACE FUNCTION generate_technical_subprotocol(p_ticket_id UUID)
RETURNS VARCHAR LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_protocol VARCHAR; v_tenant UUID; v_next INT;
BEGIN
  SELECT protocol,tenant_id INTO v_protocol,v_tenant FROM tickets
    WHERE id=p_ticket_id AND tenant_id=user_tenant_id();
  IF v_protocol IS NULL THEN RAISE EXCEPTION 'Chamado não encontrado'; END IF;
  IF user_role_code() NOT IN ('SUPERADMIN','ADMIN_EMPRESA','DIRETORIA','RESPONSAVEL_TECNICA','TECNICO','SAC') THEN
    RAISE EXCEPTION 'Sem permissão para registrar assistência técnica';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('AT' || p_ticket_id::text));
  SELECT COALESCE(MAX((regexp_match(subprotocol,'-AT([0-9]+)$'))[1]::INT),0)+1 INTO v_next
    FROM technical_cases WHERE ticket_id=p_ticket_id;
  RETURN v_protocol || '-AT' || LPAD(v_next::TEXT,2,'0');
END $$;

REVOKE ALL ON FUNCTION generate_technical_subprotocol(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION generate_technical_subprotocol(UUID) TO authenticated;
