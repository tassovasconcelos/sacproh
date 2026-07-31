
-- Mantém a sequência oficial, mesmo após importações e exclusões, e protege exclusões operacionais.
CREATE OR REPLACE FUNCTION generate_ticket_protocol(p_tenant_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ym VARCHAR(4); v_seq INT; v_existing_max INT;
BEGIN
  v_ym := TO_CHAR(CURRENT_DATE, 'YYMM');
  PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::text || v_ym));
  SELECT COALESCE(MAX((regexp_match(protocol, '^SAC\.' || v_ym || '\.([0-9]+)$'))[1]::INT),0)
    INTO v_existing_max FROM tickets WHERE tenant_id=p_tenant_id AND protocol ~ ('^SAC\.' || v_ym || '\.[0-9]+$');
  INSERT INTO ticket_sequences(tenant_id,year_month,last_value) VALUES(p_tenant_id,v_ym,v_existing_max+1)
  ON CONFLICT(tenant_id,year_month) DO UPDATE
    SET last_value=GREATEST(ticket_sequences.last_value, v_existing_max)+1
  RETURNING last_value INTO v_seq;
  RETURN 'SAC.' || v_ym || '.' || LPAD(v_seq::TEXT,3,'0');
END $$;

CREATE OR REPLACE FUNCTION delete_ticket_controlled(p_ticket_id UUID, p_reason TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_ticket tickets%ROWTYPE; v_profile profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id=auth.uid() AND is_active;
  SELECT * INTO v_ticket FROM tickets WHERE id=p_ticket_id AND tenant_id=v_profile.tenant_id;
  IF v_ticket.id IS NULL THEN RAISE EXCEPTION 'SAC não encontrado'; END IF;
  IF v_profile.role_code NOT IN ('SUPERADMIN','ADMIN_EMPRESA','DIRETORIA') THEN RAISE EXCEPTION 'Sem permissão para excluir SAC'; END IF;
  IF COALESCE(trim(p_reason),'')='' THEN RAISE EXCEPTION 'Informe o motivo da exclusão'; END IF;
  INSERT INTO audit_logs(tenant_id,user_id,user_email,action,entity,entity_id,details)
  VALUES(v_ticket.tenant_id,v_profile.id,v_profile.email,'TICKET_DELETED','TICKET',v_ticket.id,
    jsonb_build_object('protocol',v_ticket.protocol,'reason',p_reason,'customer_id',v_ticket.customer_id,'status',v_ticket.status));
  DELETE FROM tickets WHERE id=v_ticket.id;
  RETURN TRUE;
END $$;

CREATE OR REPLACE FUNCTION delete_service_order_controlled(p_os_id UUID, p_reason TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_os service_orders%ROWTYPE; v_profile profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id=auth.uid() AND is_active;
  SELECT * INTO v_os FROM service_orders WHERE id=p_os_id AND tenant_id=v_profile.tenant_id;
  IF v_os.id IS NULL THEN RAISE EXCEPTION 'OS não encontrada'; END IF;
  IF v_profile.role_code NOT IN ('SUPERADMIN','ADMIN_EMPRESA','DIRETORIA','RESPONSAVEL_TECNICA') THEN RAISE EXCEPTION 'Sem permissão para excluir OS'; END IF;
  IF COALESCE(trim(p_reason),'')='' THEN RAISE EXCEPTION 'Informe o motivo da exclusão'; END IF;
  INSERT INTO audit_logs(tenant_id,user_id,user_email,action,entity,entity_id,details)
  VALUES(v_os.tenant_id,v_profile.id,v_profile.email,'SERVICE_ORDER_DELETED','SERVICE_ORDER',v_os.id,
    jsonb_build_object('os_number',v_os.os_number,'ticket_id',v_os.ticket_id,'reason',p_reason));
  DELETE FROM service_orders WHERE id=v_os.id;
  RETURN TRUE;
END $$;

GRANT EXECUTE ON FUNCTION delete_ticket_controlled(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_service_order_controlled(UUID,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION generate_service_order_number(p_tenant_id UUID)
RETURNS VARCHAR LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_year TEXT:=TO_CHAR(CURRENT_DATE,'YYYY'); v_next INT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('OS' || p_tenant_id::text || v_year));
  SELECT COALESCE(MAX((regexp_match(os_number,'^OS-' || v_year || '-([0-9]+)$'))[1]::INT),0)+1 INTO v_next
  FROM service_orders WHERE tenant_id=p_tenant_id AND os_number ~ ('^OS-' || v_year || '-[0-9]+$');
  RETURN 'OS-' || v_year || '-' || LPAD(v_next::TEXT,4,'0');
END $$;
GRANT EXECUTE ON FUNCTION generate_service_order_number(UUID) TO authenticated;

