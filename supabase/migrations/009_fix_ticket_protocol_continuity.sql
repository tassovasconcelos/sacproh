-- Mantém a numeração histórica SAC.AAMMNNN (ex.: SAC.2607265)
-- e também reconhece protocolos pontuados criados por versões anteriores.
CREATE OR REPLACE FUNCTION generate_ticket_protocol(p_tenant_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_ym TEXT := TO_CHAR(NOW(), 'YYMM');
  v_existing_max INT;
  v_next INT;
BEGIN
  SELECT COALESCE(MAX(
    CASE
      WHEN protocol ~ ('^SAC\.' || v_ym || '[0-9]+$')
        THEN SUBSTRING(protocol FROM LENGTH('SAC.' || v_ym) + 1)::INT
      WHEN protocol ~ ('^SAC\.' || v_ym || '\.[0-9]+$')
        THEN (REGEXP_MATCH(protocol, '^SAC\.' || v_ym || '\.([0-9]+)$'))[1]::INT
      ELSE NULL
    END
  ), 0)
  INTO v_existing_max
  FROM tickets
  WHERE tenant_id = p_tenant_id;

  INSERT INTO ticket_sequences (tenant_id, year_month, last_value)
  VALUES (p_tenant_id, v_ym, v_existing_max + 1)
  ON CONFLICT (tenant_id, year_month) DO UPDATE
    SET last_value = GREATEST(ticket_sequences.last_value, v_existing_max) + 1
  RETURNING last_value INTO v_next;

  RETURN 'SAC.' || v_ym || LPAD(v_next::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Corrige somente o protocolo divergente criado no dia da implantação.
DO $$
DECLARE
  v_ticket RECORD;
  v_ym TEXT;
  v_max INT;
  v_corrected TEXT;
BEGIN
  SELECT id, tenant_id, protocol, created_at
  INTO v_ticket
  FROM tickets
  WHERE protocol = 'SAC.2607.001'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_ticket.id IS NULL THEN
    RETURN;
  END IF;

  v_ym := TO_CHAR(v_ticket.created_at, 'YYMM');
  SELECT COALESCE(MAX(
    CASE
      WHEN protocol ~ ('^SAC\.' || v_ym || '[0-9]+$')
        THEN SUBSTRING(protocol FROM LENGTH('SAC.' || v_ym) + 1)::INT
      WHEN protocol ~ ('^SAC\.' || v_ym || '\.[0-9]+$') AND protocol <> v_ticket.protocol
        THEN (REGEXP_MATCH(protocol, '^SAC\.' || v_ym || '\.([0-9]+)$'))[1]::INT
      ELSE NULL
    END
  ), 0)
  INTO v_max
  FROM tickets
  WHERE tenant_id = v_ticket.tenant_id;

  v_corrected := 'SAC.' || v_ym || LPAD((v_max + 1)::TEXT, 3, '0');
  UPDATE tickets SET protocol = v_corrected, updated_at = NOW() WHERE id = v_ticket.id;

  INSERT INTO ticket_sequences (tenant_id, year_month, last_value)
  VALUES (v_ticket.tenant_id, v_ym, v_max + 1)
  ON CONFLICT (tenant_id, year_month) DO UPDATE
    SET last_value = GREATEST(ticket_sequences.last_value, EXCLUDED.last_value);

  INSERT INTO audit_logs (tenant_id, action, entity, entity_id, details)
  VALUES (v_ticket.tenant_id, 'PROTOCOL_CORRECTED', 'TICKET', v_ticket.id,
    jsonb_build_object('previous_protocol', v_ticket.protocol, 'new_protocol', v_corrected,
      'reason', 'Continuidade da sequência histórica'));
END;
$$;

