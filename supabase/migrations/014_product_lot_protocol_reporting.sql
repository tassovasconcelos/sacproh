-- Preserva os dados do produto no momento da abertura do SAC e garante rastreabilidade por lote.
ALTER TABLE ticket_items
  ADD COLUMN IF NOT EXISTS product_model VARCHAR(150);

UPDATE ticket_items AS item
SET product_model = product.model
FROM products AS product
WHERE item.product_id = product.id
  AND NULLIF(BTRIM(item.product_model), '') IS NULL;

-- Registros antigos não podem impedir a nova regra. Eles permanecem claramente identificados.
UPDATE ticket_items
SET lot_number = 'SEM_LOTE_HISTORICO'
WHERE NULLIF(BTRIM(lot_number), '') IS NULL;

ALTER TABLE ticket_items
  ALTER COLUMN lot_number SET NOT NULL;

ALTER TABLE ticket_items
  DROP CONSTRAINT IF EXISTS ticket_items_lot_number_not_blank;

ALTER TABLE ticket_items
  ADD CONSTRAINT ticket_items_lot_number_not_blank
  CHECK (BTRIM(lot_number) <> '');

CREATE INDEX IF NOT EXISTS ticket_items_product_lot_idx
  ON ticket_items (product_id, lot_number);

CREATE INDEX IF NOT EXISTS ticket_items_model_lot_idx
  ON ticket_items (product_model, lot_number);

-- Recalibra o contador com o maior protocolo já gravado, sem reduzir sequências existentes.
WITH parsed_protocols AS (
  SELECT
    tenant_id,
    SUBSTRING(protocol FROM 5 FOR 4) AS year_month,
    CASE
      WHEN protocol ~ '^SAC\.[0-9]{4}[0-9]+$' THEN SUBSTRING(protocol FROM 9)::INT
      WHEN protocol ~ '^SAC\.[0-9]{4}\.[0-9]+$' THEN SUBSTRING(protocol FROM 10)::INT
    END AS sequence_number
  FROM tickets
  WHERE protocol ~ '^SAC\.[0-9]{4}(\.)?[0-9]+$'
), maximums AS (
  SELECT tenant_id, year_month, MAX(sequence_number) AS last_value
  FROM parsed_protocols
  GROUP BY tenant_id, year_month
)
INSERT INTO ticket_sequences (tenant_id, year_month, last_value)
SELECT tenant_id, year_month, last_value
FROM maximums
ON CONFLICT (tenant_id, year_month) DO UPDATE
SET last_value = GREATEST(ticket_sequences.last_value, EXCLUDED.last_value);

-- Gera SAC.AAMMNNN de forma atômica, inclusive com vários usuários abrindo SAC ao mesmo tempo.
CREATE OR REPLACE FUNCTION generate_ticket_protocol(p_tenant_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_ym TEXT := TO_CHAR(CURRENT_DATE, 'YYMM');
  v_existing_max INT := 0;
  v_saved_value INT := 0;
  v_next INT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant_id::TEXT || ':' || v_ym, 0));

  SELECT COALESCE(MAX(
    CASE
      WHEN protocol ~ ('^SAC\.' || v_ym || '[0-9]+$')
        THEN SUBSTRING(protocol FROM LENGTH('SAC.' || v_ym) + 1)::INT
      WHEN protocol ~ ('^SAC\.' || v_ym || '\.[0-9]+$')
        THEN SUBSTRING(protocol FROM LENGTH('SAC.' || v_ym || '.') + 1)::INT
    END
  ), 0)
  INTO v_existing_max
  FROM tickets
  WHERE tenant_id = p_tenant_id;

  SELECT COALESCE(last_value, 0)
  INTO v_saved_value
  FROM ticket_sequences
  WHERE tenant_id = p_tenant_id AND year_month = v_ym;

  v_next := GREATEST(v_existing_max, v_saved_value) + 1;

  INSERT INTO ticket_sequences (tenant_id, year_month, last_value)
  VALUES (p_tenant_id, v_ym, v_next)
  ON CONFLICT (tenant_id, year_month) DO UPDATE
  SET last_value = EXCLUDED.last_value;

  RETURN 'SAC.' || v_ym || LPAD(v_next::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Visão pronta para relatórios e exportações por produto, modelo e lote.
CREATE OR REPLACE VIEW product_lot_sac_analysis
WITH (security_invoker = true) AS
SELECT
  ticket.tenant_id,
  item.product_id,
  item.product_name,
  COALESCE(item.product_model, product.model, 'Modelo não informado') AS product_model,
  COALESCE(item.sku, product.code_sku, 'N/A') AS sku,
  item.lot_number,
  SUM(GREATEST(item.quantity, 1))::BIGINT AS complained_quantity,
  COUNT(DISTINCT ticket.id)::BIGINT AS sac_count,
  COUNT(DISTINCT ticket.id) FILTER (
    WHERE ticket.status NOT IN ('CLOSED', 'CANCELLED', 'RESOLVED')
  )::BIGINT AS open_sac_count,
  COUNT(DISTINCT ticket.id) FILTER (
    WHERE ticket.priority = 'CRITICAL'
       OR ticket.user_risk_flag
       OR ticket.adverse_event_flag
  )::BIGINT AS critical_sac_count
FROM ticket_items AS item
JOIN tickets AS ticket ON ticket.id = item.ticket_id
LEFT JOIN products AS product ON product.id = item.product_id
GROUP BY
  ticket.tenant_id,
  item.product_id,
  item.product_name,
  COALESCE(item.product_model, product.model, 'Modelo não informado'),
  COALESCE(item.sku, product.code_sku, 'N/A'),
  item.lot_number;

GRANT SELECT ON product_lot_sac_analysis TO authenticated;

-- Mantém a importação histórica compatível com lote obrigatório e vincula o catálogo pelo SKU.
CREATE OR REPLACE FUNCTION import_historical_sac(p_tickets JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant UUID; v_role TEXT; v_ticket JSONB; v_item JSONB;
  v_customer UUID; v_ticket_id UUID; v_product_id UUID; v_product_model TEXT;
  v_imported INT := 0; v_skipped INT := 0; v_document TEXT; v_lot TEXT;
BEGIN
  SELECT tenant_id, role_code INTO v_tenant, v_role
  FROM profiles WHERE id = auth.uid() AND is_active;
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
    v_document := COALESCE(NULLIF(v_ticket->>'customerDocument',''), 'HIST-' || SUBSTR(MD5(v_ticket->>'customerName'),1,14));
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
      v_lot := NULLIF(BTRIM(v_item->>'lotNumber'), '');
      IF v_lot IS NULL THEN
        RAISE EXCEPTION 'O lote é obrigatório para todos os produtos importados';
      END IF;
      SELECT id, model INTO v_product_id, v_product_model
      FROM products
      WHERE tenant_id = v_tenant AND code_sku = v_item->>'sku' AND is_active
      LIMIT 1;
      INSERT INTO ticket_items(ticket_id,product_id,product_name,product_model,sku,quantity,lot_number,serial_number)
      VALUES(v_ticket_id,v_product_id,v_item->>'productName',v_product_model,NULLIF(v_item->>'sku',''),GREATEST(COALESCE((v_item->>'quantity')::int,1),1),v_lot,NULLIF(v_item->>'serialNumber',''));
      v_product_id := NULL; v_product_model := NULL;
    END LOOP;
    v_imported := v_imported + 1;
  END LOOP;
  INSERT INTO audit_logs(tenant_id,user_id,user_email,action,entity,details)
  SELECT v_tenant,id,email,'HISTORICAL_IMPORT','TICKET',jsonb_build_object('imported',v_imported,'skipped',v_skipped)
  FROM profiles WHERE id=auth.uid();
  RETURN jsonb_build_object('imported',v_imported,'skipped',v_skipped);
END $$;

GRANT EXECUTE ON FUNCTION import_historical_sac(JSONB) TO authenticated;
