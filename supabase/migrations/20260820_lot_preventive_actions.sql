-- Decisões formais e auditáveis de contenção, bloqueio e recall.
CREATE TABLE IF NOT EXISTS lot_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_lot_id UUID NOT NULL REFERENCES product_lots(id) ON DELETE CASCADE,
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('MONITOR','QUARANTINE','BLOCK','RECALL')),
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','COMPLETED','CANCELLED')),
  reason TEXT NOT NULL CHECK (length(trim(reason)) >= 10),
  owner_name VARCHAR(255) NOT NULL,
  due_date DATE,
  affected_customers INTEGER NOT NULL DEFAULT 0 CHECK (affected_customers >= 0),
  affected_units INTEGER NOT NULL DEFAULT 0 CHECK (affected_units >= 0),
  created_by UUID REFERENCES profiles(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS lot_actions_tenant_status_idx ON lot_actions(tenant_id,status);
CREATE INDEX IF NOT EXISTS lot_actions_lot_idx ON lot_actions(product_lot_id,created_at DESC);
ALTER TABLE lot_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY lot_actions_tenant_read ON lot_actions FOR SELECT TO authenticated
  USING (tenant_id=user_tenant_id() OR user_role_code()='SUPERADMIN');
CREATE POLICY lot_actions_controlled_insert ON lot_actions FOR INSERT TO authenticated
  WITH CHECK ((tenant_id=user_tenant_id() OR user_role_code()='SUPERADMIN')
    AND user_role_code() IN ('SUPERADMIN','DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA'));
CREATE POLICY lot_actions_controlled_update ON lot_actions FOR UPDATE TO authenticated
  USING ((tenant_id=user_tenant_id() OR user_role_code()='SUPERADMIN')
    AND user_role_code() IN ('SUPERADMIN','DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA'))
  WITH CHECK ((tenant_id=user_tenant_id() OR user_role_code()='SUPERADMIN')
    AND user_role_code() IN ('SUPERADMIN','DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA'));

GRANT SELECT,INSERT,UPDATE ON lot_actions TO authenticated;

CREATE OR REPLACE FUNCTION apply_lot_action_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE product_lots
  SET status = CASE NEW.action_type
    WHEN 'QUARANTINE' THEN 'QUARANTINE'
    WHEN 'BLOCK' THEN 'BLOCKED'
    WHEN 'RECALL' THEN 'RECALL'
    ELSE status END,
    updated_at = NOW()
  WHERE id = NEW.product_lot_id AND tenant_id = NEW.tenant_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lot_action_status_sync ON lot_actions;
CREATE TRIGGER lot_action_status_sync
AFTER INSERT ON lot_actions FOR EACH ROW EXECUTE FUNCTION apply_lot_action_status();
