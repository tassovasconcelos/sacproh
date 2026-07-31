-- SLA operacional padrão. Uma política específica por categoria, quando existir,
-- prevalece sobre a política geral da mesma prioridade.
INSERT INTO sla_policies (tenant_id, category, priority, first_response_minutes, resolution_minutes, is_active)
SELECT t.id, NULL, policy.priority, policy.first_response_minutes, policy.resolution_minutes, TRUE
FROM tenants t
CROSS JOIN (VALUES
  ('CRITICAL', 30, 43200),
  ('HIGH', 60, 43200),
  ('MEDIUM', 240, 43200),
  ('LOW', 480, 43200)
) AS policy(priority, first_response_minutes, resolution_minutes)
WHERE NOT EXISTS (
  SELECT 1 FROM sla_policies current_policy
  WHERE current_policy.tenant_id = t.id
    AND current_policy.category IS NULL
    AND current_policy.priority = policy.priority
);

CREATE OR REPLACE FUNCTION apply_ticket_sla()
RETURNS TRIGGER AS $$
DECLARE
  resolution_limit INT;
BEGIN
  SELECT policy.resolution_minutes INTO resolution_limit
  FROM sla_policies policy
  WHERE policy.tenant_id = NEW.tenant_id
    AND policy.priority = NEW.priority
    AND policy.is_active = TRUE
    AND (policy.category = NEW.category OR policy.category IS NULL)
  ORDER BY (policy.category IS NOT NULL) DESC
  LIMIT 1;

  IF resolution_limit IS NULL THEN
    resolution_limit := 43200; -- 30 dias corridos: limite do art. 18, § 1º, do CDC
  END IF;

  IF NEW.sla_due_at IS NULL
     OR TG_OP = 'UPDATE' AND (NEW.priority IS DISTINCT FROM OLD.priority OR NEW.category IS DISTINCT FROM OLD.category) THEN
    NEW.sla_due_at := COALESCE(NEW.created_at, NOW()) + make_interval(mins => resolution_limit);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tickets_apply_sla ON tickets;
CREATE TRIGGER tickets_apply_sla
BEFORE INSERT OR UPDATE OF priority, category ON tickets
FOR EACH ROW EXECUTE FUNCTION apply_ticket_sla();

UPDATE tickets ticket
SET sla_due_at = ticket.created_at + make_interval(mins => COALESCE((
  SELECT policy.resolution_minutes
  FROM sla_policies policy
  WHERE policy.tenant_id = ticket.tenant_id
    AND policy.priority = ticket.priority
    AND policy.is_active = TRUE
    AND (policy.category = ticket.category OR policy.category IS NULL)
  ORDER BY (policy.category IS NOT NULL) DESC
  LIMIT 1
), 43200))
WHERE ticket.sla_due_at IS NULL
  AND ticket.status NOT IN ('CLOSED_PROCEDENT', 'CLOSED_NON_PROCEDENT', 'CANCELLED');
