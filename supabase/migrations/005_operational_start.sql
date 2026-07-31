-- Início da operação: identidade real, importação histórica e zeramento auditado.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS job_title VARCHAR(150),
  ADD COLUMN IF NOT EXISTS department VARCHAR(150),
  ADD COLUMN IF NOT EXISTS employee_code VARCHAR(80),
  ADD COLUMN IF NOT EXISTS manager_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE OR REPLACE FUNCTION reset_operational_sac_data()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant UUID; v_role TEXT;
BEGIN
  SELECT tenant_id, role_code INTO v_tenant, v_role FROM profiles WHERE id = auth.uid() AND is_active;
  IF v_tenant IS NULL OR v_role NOT IN ('SUPERADMIN','ADMIN_EMPRESA') THEN
    RAISE EXCEPTION 'Usuário sem permissão para zerar os registros operacionais';
  END IF;

  DELETE FROM survey_responses WHERE ticket_id IN (SELECT id FROM tickets WHERE tenant_id = v_tenant);
  DELETE FROM service_orders WHERE tenant_id = v_tenant;
  DELETE FROM logistics_cases WHERE ticket_id IN (SELECT id FROM tickets WHERE tenant_id = v_tenant);
  DELETE FROM technical_cases WHERE ticket_id IN (SELECT id FROM tickets WHERE tenant_id = v_tenant);
  DELETE FROM action_plans WHERE tenant_id = v_tenant;
  DELETE FROM tickets WHERE tenant_id = v_tenant;
  DELETE FROM ticket_sequences WHERE tenant_id = v_tenant;
  INSERT INTO audit_logs(tenant_id,user_id,user_email,action,entity,details)
  SELECT v_tenant,id,email,'OPERATIONAL_DATA_RESET','SYSTEM',jsonb_build_object('preserved','users, customers, products, suppliers, units')
  FROM profiles WHERE id = auth.uid();
  RETURN TRUE;
END $$;

CREATE OR REPLACE FUNCTION import_historical_sac(p_tickets JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant UUID; v_role TEXT; v_ticket JSONB; v_item JSONB;
  v_customer UUID; v_ticket_id UUID; v_imported INT := 0; v_skipped INT := 0; v_document TEXT;
BEGIN
  SELECT tenant_id, role_code INTO v_tenant, v_role FROM profiles WHERE id = auth.uid() AND is_active;
  IF v_tenant IS NULL OR v_role NOT IN ('SUPERADMIN','ADMIN_EMPRESA') THEN
    RAISE EXCEPTION 'Usuário sem permissão para importar registros';
  END IF;
  IF jsonb_typeof(p_tickets) <> 'array' OR jsonb_array_length(p_tickets) > 5000 THEN
    RAISE EXCEPTION 'Arquivo inválido ou superior ao limite de 5.000 protocolos';
  END IF;

  FOR v_ticket IN SELECT value FROM jsonb_array_elements(p_tickets) LOOP
    IF EXISTS (SELECT 1 FROM tickets WHERE protocol = v_ticket->>'protocol') THEN
      v_skipped := v_skipped + 1; CONTINUE;
    END IF;
    v_document := COALESCE(NULLIF(v_ticket->>'customerDocument',''), 'HIST-' || substr(md5(v_ticket->>'customerName'),1,14));
    INSERT INTO customers(tenant_id,type,name,document)
    VALUES(v_tenant,'PJ',v_ticket->>'customerName',v_document)
    ON CONFLICT(tenant_id,document) DO UPDATE SET name=EXCLUDED.name
    RETURNING id INTO v_customer;

    INSERT INTO tickets(tenant_id,protocol,customer_id,description,category,status,priority,invoice_number,created_by,created_at,updated_at)
    VALUES(v_tenant,v_ticket->>'protocol',v_customer,v_ticket->>'description',COALESCE(NULLIF(v_ticket->>'category',''),'SAC / Outros'),
      CASE WHEN v_ticket->>'status' IN ('NEW','TRIAGE','WAITING_DOCS','TECHNICAL_ANALYSIS','SENT_TO_TECHNICAL','SENT_TO_LOGISTICS','WAITING_SUPPLIER','WAITING_CARRIER','WAITING_CUSTOMER','CORRECTIVE_ACTION','SOLUTION_PROPOSED','WAITING_CONFIRMATION','CLOSED_PROCEDENT','CLOSED_NON_PROCEDENT','CANCELLED','REOPENED') THEN v_ticket->>'status' ELSE 'TRIAGE' END,
      CASE WHEN v_ticket->>'priority' IN ('LOW','MEDIUM','HIGH','CRITICAL') THEN v_ticket->>'priority' ELSE 'MEDIUM' END,
      NULLIF(v_ticket->>'invoiceNumber',''),auth.uid(),COALESCE(NULLIF(v_ticket->>'openedAt','')::timestamptz,NOW()),NOW())
    RETURNING id INTO v_ticket_id;

    FOR v_item IN SELECT value FROM jsonb_array_elements(v_ticket->'items') LOOP
      INSERT INTO ticket_items(ticket_id,product_name,sku,quantity,lot_number,serial_number)
      VALUES(v_ticket_id,v_item->>'productName',NULLIF(v_item->>'sku',''),GREATEST(COALESCE((v_item->>'quantity')::int,1),1),NULLIF(v_item->>'lotNumber',''),NULLIF(v_item->>'serialNumber',''));
    END LOOP;
    v_imported := v_imported + 1;
  END LOOP;
  INSERT INTO audit_logs(tenant_id,user_id,user_email,action,entity,details)
  SELECT v_tenant,id,email,'HISTORICAL_IMPORT','TICKET',jsonb_build_object('imported',v_imported,'skipped',v_skipped)
  FROM profiles WHERE id=auth.uid();
  RETURN jsonb_build_object('imported',v_imported,'skipped',v_skipped);
END $$;

GRANT EXECUTE ON FUNCTION reset_operational_sac_data() TO authenticated;
GRANT EXECUTE ON FUNCTION import_historical_sac(JSONB) TO authenticated;
