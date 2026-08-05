-- A sequência do SAC é contínua entre os meses.
-- Exemplo: SAC.2607265 (julho) -> SAC.2608266 (agosto).
DO $$
DECLARE
  v_tenant RECORD;
  v_ticket RECORD;
  v_current_ym TEXT := TO_CHAR(CURRENT_DATE, 'YYMM');
  v_previous_max INT;
  v_global_max INT;
  v_new_protocol TEXT;
BEGIN
  FOR v_tenant IN SELECT DISTINCT tenant_id FROM tickets LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(v_tenant.tenant_id::TEXT || ':ticket-protocol', 0));

    SELECT COALESCE(MAX(
      CASE
        WHEN protocol ~ '^SAC\.[0-9]{4}[0-9]+$' THEN SUBSTRING(protocol FROM 9)::INT
        WHEN protocol ~ '^SAC\.[0-9]{4}\.[0-9]+$' THEN SUBSTRING(protocol FROM 10)::INT
      END
    ), 0)
    INTO v_previous_max
    FROM tickets
    WHERE tenant_id = v_tenant.tenant_id
      AND SUBSTRING(protocol FROM 5 FOR 4) <> v_current_ym
      AND protocol ~ '^SAC\.[0-9]{4}(\.)?[0-9]+$';

    SELECT COALESCE(MAX(
      CASE
        WHEN protocol ~ '^SAC\.[0-9]{4}[0-9]+$' THEN SUBSTRING(protocol FROM 9)::INT
        WHEN protocol ~ '^SAC\.[0-9]{4}\.[0-9]+$' THEN SUBSTRING(protocol FROM 10)::INT
      END
    ), 0)
    INTO v_global_max
    FROM tickets
    WHERE tenant_id = v_tenant.tenant_id
      AND protocol ~ '^SAC\.[0-9]{4}(\.)?[0-9]+$';

    -- Corrige apenas os números do mês atual que reiniciaram abaixo da sequência anterior.
    FOR v_ticket IN
      SELECT
        id,
        protocol,
        CASE
          WHEN protocol ~ ('^SAC\.' || v_current_ym || '[0-9]+$') THEN SUBSTRING(protocol FROM 9)::INT
          WHEN protocol ~ ('^SAC\.' || v_current_ym || '\.[0-9]+$') THEN SUBSTRING(protocol FROM 10)::INT
        END AS sequence_number
      FROM tickets
      WHERE tenant_id = v_tenant.tenant_id
        AND protocol ~ ('^SAC\.' || v_current_ym || '(\.)?[0-9]+$')
      ORDER BY created_at, id
    LOOP
      IF v_ticket.sequence_number <= v_previous_max THEN
        v_global_max := v_global_max + 1;
        v_new_protocol := 'SAC.' || v_current_ym || LPAD(v_global_max::TEXT, 3, '0');

        UPDATE tickets
        SET protocol = v_new_protocol, updated_at = NOW()
        WHERE id = v_ticket.id;

        INSERT INTO audit_logs(tenant_id, action, entity, entity_id, details)
        VALUES (
          v_tenant.tenant_id,
          'PROTOCOL_CORRECTED',
          'TICKET',
          v_ticket.id,
          jsonb_build_object(
            'previous_protocol', v_ticket.protocol,
            'new_protocol', v_new_protocol,
            'reason', 'Continuidade numérica entre os meses'
          )
        );
      END IF;
    END LOOP;

    INSERT INTO ticket_sequences(tenant_id, year_month, last_value)
    VALUES(v_tenant.tenant_id, v_current_ym, v_global_max)
    ON CONFLICT (tenant_id, year_month) DO UPDATE
    SET last_value = GREATEST(ticket_sequences.last_value, EXCLUDED.last_value);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION generate_ticket_protocol(p_tenant_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_ym TEXT := TO_CHAR(CURRENT_DATE, 'YYMM');
  v_existing_max INT := 0;
  v_saved_value INT := 0;
  v_next INT;
BEGIN
  -- O bloqueio é por empresa, e não por mês, pois a sequência atravessa a virada mensal.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant_id::TEXT || ':ticket-protocol', 0));

  SELECT COALESCE(MAX(
    CASE
      WHEN protocol ~ '^SAC\.[0-9]{4}[0-9]+$' THEN SUBSTRING(protocol FROM 9)::INT
      WHEN protocol ~ '^SAC\.[0-9]{4}\.[0-9]+$' THEN SUBSTRING(protocol FROM 10)::INT
    END
  ), 0)
  INTO v_existing_max
  FROM tickets
  WHERE tenant_id = p_tenant_id
    AND protocol ~ '^SAC\.[0-9]{4}(\.)?[0-9]+$';

  SELECT COALESCE(last_value, 0)
  INTO v_saved_value
  FROM ticket_sequences
  WHERE tenant_id = p_tenant_id AND year_month = v_ym;

  v_next := GREATEST(v_existing_max, v_saved_value) + 1;

  INSERT INTO ticket_sequences(tenant_id, year_month, last_value)
  VALUES(p_tenant_id, v_ym, v_next)
  ON CONFLICT (tenant_id, year_month) DO UPDATE
  SET last_value = EXCLUDED.last_value;

  RETURN 'SAC.' || v_ym || LPAD(v_next::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
