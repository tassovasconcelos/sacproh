-- SACPROH V4.3 - rastreabilidade, encerramento, correcao cadastral e custos

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.ticket_comments ADD COLUMN IF NOT EXISTS comment_type text NOT NULL DEFAULT 'DAILY_ACTION';
ALTER TABLE public.ticket_attachments ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'EVIDENCE';
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS consumer_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS consumer_rule_code text,
  ADD COLUMN IF NOT EXISTS consumer_rule_notes text;

CREATE TABLE IF NOT EXISTS public.ticket_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name text,
  source_type text,
  source_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket_time ON public.ticket_events(ticket_id, occurred_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ticket_events_source ON public.ticket_events(source_type, source_id) WHERE source_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.customer_change_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_by_name text,
  reason text NOT NULL,
  changes jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_change_history_customer ON public.customer_change_history(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_change_history_ticket ON public.customer_change_history(ticket_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ticket_costs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  cost_type text NOT NULL CHECK (cost_type IN ('BONUS_INVOICE','RETURN_INVOICE','OUTBOUND_FREIGHT','RETURN_FREIGHT','TECHNICAL_SERVICE','PARTS','PRODUCT_REPLACEMENT','REFUND','OTHER')),
  description text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  invoice_number text,
  supplier_name text,
  occurred_at date NOT NULL DEFAULT current_date,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_costs_ticket ON public.ticket_costs(ticket_id, occurred_at DESC, created_at DESC);

ALTER TABLE public.ticket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.customer_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_change_history FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_costs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ticket_events_tenant_access ON public.ticket_events;
CREATE POLICY ticket_events_tenant_access ON public.ticket_events FOR SELECT TO authenticated USING (tenant_id = public.user_tenant_id());
DROP POLICY IF EXISTS customer_change_history_tenant_access ON public.customer_change_history;
CREATE POLICY customer_change_history_tenant_access ON public.customer_change_history FOR SELECT TO authenticated USING (tenant_id = public.user_tenant_id());
DROP POLICY IF EXISTS ticket_costs_tenant_read ON public.ticket_costs;
CREATE POLICY ticket_costs_tenant_read ON public.ticket_costs FOR SELECT TO authenticated USING (tenant_id = public.user_tenant_id());
DROP POLICY IF EXISTS ticket_costs_tenant_write ON public.ticket_costs;
CREATE POLICY ticket_costs_tenant_write ON public.ticket_costs FOR ALL TO authenticated
USING (tenant_id = public.user_tenant_id() AND public.user_role_code() IN ('SUPERADMIN','ADMIN_EMPRESA','DIRETORIA','RESPONSAVEL_TECNICA','SAC','TECNICO'))
WITH CHECK (tenant_id = public.user_tenant_id() AND public.user_role_code() IN ('SUPERADMIN','ADMIN_EMPRESA','DIRETORIA','RESPONSAVEL_TECNICA','SAC','TECNICO'));
GRANT SELECT ON public.ticket_events, public.customer_change_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_costs TO authenticated;

CREATE OR REPLACE FUNCTION public.append_ticket_event(p_ticket_id uuid,p_event_type text,p_title text,p_description text,p_actor_id uuid,p_actor_name text,p_source_type text,p_source_id uuid,p_metadata jsonb,p_occurred_at timestamptz) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
DECLARE v_tenant uuid;
BEGIN
 SELECT tenant_id INTO v_tenant FROM public.tickets WHERE id=p_ticket_id;
 IF v_tenant IS NULL THEN RETURN; END IF;
 INSERT INTO public.ticket_events(tenant_id,ticket_id,event_type,title,description,actor_id,actor_name,source_type,source_id,metadata,occurred_at)
 VALUES(v_tenant,p_ticket_id,p_event_type,p_title,p_description,p_actor_id,p_actor_name,p_source_type,p_source_id,COALESCE(p_metadata,'{}'::jsonb),COALESCE(p_occurred_at,now()))
 ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.append_ticket_event(uuid,text,text,text,uuid,text,text,uuid,jsonb,timestamptz) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.trg_ticket_history_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
BEGIN
 PERFORM public.append_ticket_event(NEW.ticket_id,CASE WHEN NEW.new_status='QUALIFICATION_UPDATE' THEN 'QUALIFICATION' ELSE 'STATUS' END,CASE WHEN NEW.new_status='QUALIFICATION_UPDATE' THEN 'Qualificação atualizada' ELSE 'Status alterado' END,NEW.notes,NEW.changed_by,NEW.changed_by_name,'ticket_status_history',NEW.id,jsonb_build_object('previous_status',NEW.previous_status,'new_status',NEW.new_status),NEW.created_at);
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_ticket_history_to_event ON public.ticket_status_history;
CREATE TRIGGER trg_ticket_history_to_event AFTER INSERT ON public.ticket_status_history FOR EACH ROW EXECUTE FUNCTION public.trg_ticket_history_event();

CREATE OR REPLACE FUNCTION public.trg_ticket_comment_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
BEGIN
 PERFORM public.append_ticket_event(NEW.ticket_id,'COMMENT','Comentário registrado',NEW.content,NEW.author_id,NEW.author_name,'ticket_comments',NEW.id,jsonb_build_object('internal',NEW.is_internal,'comment_type',NEW.comment_type),NEW.created_at);
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_ticket_comment_to_event ON public.ticket_comments;
CREATE TRIGGER trg_ticket_comment_to_event AFTER INSERT ON public.ticket_comments FOR EACH ROW EXECUTE FUNCTION public.trg_ticket_comment_event();

CREATE OR REPLACE FUNCTION public.trg_ticket_attachment_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
DECLARE v_name text;
BEGIN
 SELECT full_name INTO v_name FROM public.profiles WHERE id=NEW.uploaded_by;
 PERFORM public.append_ticket_event(NEW.ticket_id,'ATTACHMENT','Anexo adicionado',NEW.file_name,NEW.uploaded_by,v_name,'ticket_attachments',NEW.id,jsonb_build_object('file_type',NEW.file_type,'file_size',NEW.file_size,'document_type',NEW.document_type),NEW.created_at);
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_ticket_attachment_to_event ON public.ticket_attachments;
CREATE TRIGGER trg_ticket_attachment_to_event AFTER INSERT ON public.ticket_attachments FOR EACH ROW EXECUTE FUNCTION public.trg_ticket_attachment_event();

CREATE OR REPLACE FUNCTION public.trg_ticket_cost_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
BEGIN
 PERFORM public.append_ticket_event(NEW.ticket_id,'COST','Custo registrado',NEW.description,NEW.created_by,NEW.created_by_name,'ticket_costs',NEW.id,jsonb_build_object('cost_type',NEW.cost_type,'amount',NEW.amount,'invoice_number',NEW.invoice_number),NEW.created_at);
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_ticket_cost_to_event ON public.ticket_costs;
CREATE TRIGGER trg_ticket_cost_to_event AFTER INSERT ON public.ticket_costs FOR EACH ROW EXECUTE FUNCTION public.trg_ticket_cost_event();

CREATE OR REPLACE FUNCTION public.trg_customer_change_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
BEGIN
 IF NEW.ticket_id IS NOT NULL THEN
  PERFORM public.append_ticket_event(NEW.ticket_id,'CUSTOMER_UPDATE','Dados do cliente corrigidos',NEW.reason,NEW.changed_by,NEW.changed_by_name,'customer_change_history',NEW.id,NEW.changes,NEW.created_at);
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_customer_change_to_event ON public.customer_change_history;
CREATE TRIGGER trg_customer_change_to_event AFTER INSERT ON public.customer_change_history FOR EACH ROW EXECUTE FUNCTION public.trg_customer_change_event();

REVOKE ALL ON FUNCTION public.trg_ticket_history_event() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.trg_ticket_comment_event() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.trg_ticket_attachment_event() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.trg_ticket_cost_event() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.trg_customer_change_event() FROM PUBLIC,anon,authenticated;

-- RPC controlada para correcao cadastral. O CPF/CNPJ exige administrador.
CREATE OR REPLACE FUNCTION public.update_customer_controlled(p_customer_id uuid,p_ticket_id uuid,p_changes jsonb,p_reason text) RETURNS public.customers
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
DECLARE v_tenant uuid:=public.user_tenant_id(); v_role text:=public.user_role_code(); v_old public.customers; v_new public.customers; v_actor text; v_changes jsonb:='{}'::jsonb; v_document text;
BEGIN
 IF auth.uid() IS NULL OR v_tenant IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Sessão inválida.'; END IF;
 IF v_role NOT IN ('SUPERADMIN','ADMIN_EMPRESA','DIRETORIA','RESPONSAVEL_TECNICA','SAC') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Perfil sem permissão para corrigir cliente.'; END IF;
 IF COALESCE(trim(p_reason),'')='' THEN RAISE EXCEPTION 'Motivo da correção é obrigatório.'; END IF;
 SELECT * INTO v_old FROM public.customers WHERE id=p_customer_id AND tenant_id=v_tenant;
 IF v_old.id IS NULL THEN RAISE EXCEPTION 'Cliente não encontrado.'; END IF;
 IF p_ticket_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.tickets WHERE id=p_ticket_id AND tenant_id=v_tenant AND customer_id=p_customer_id) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='SAC não pertence ao cliente informado.'; END IF;
 v_document:=NULLIF(regexp_replace(COALESCE(p_changes->>'document',v_old.document),'[^0-9A-Za-z]','','g'),''); IF v_document IS NULL THEN v_document:=v_old.document; END IF;
 IF v_document IS DISTINCT FROM v_old.document AND v_role NOT IN ('SUPERADMIN','ADMIN_EMPRESA') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Alteração de CPF/CNPJ exige administrador.'; END IF;
 IF v_document IS DISTINCT FROM v_old.document AND EXISTS(SELECT 1 FROM public.customers WHERE tenant_id=v_tenant AND document=v_document AND id<>p_customer_id) THEN RAISE EXCEPTION 'CPF/CNPJ já cadastrado para outro cliente.'; END IF;
 v_changes:=jsonb_strip_nulls(jsonb_build_object(
  'name',CASE WHEN COALESCE(p_changes->>'name',v_old.name) IS DISTINCT FROM v_old.name THEN jsonb_build_object('from',v_old.name,'to',p_changes->>'name') END,
  'trade_name',CASE WHEN COALESCE(p_changes->>'tradeName',v_old.trade_name) IS DISTINCT FROM v_old.trade_name THEN jsonb_build_object('from',v_old.trade_name,'to',p_changes->>'tradeName') END,
  'document',CASE WHEN v_document IS DISTINCT FROM v_old.document THEN jsonb_build_object('from',v_old.document,'to',v_document) END,
  'email',CASE WHEN COALESCE(p_changes->>'email',v_old.email) IS DISTINCT FROM v_old.email THEN jsonb_build_object('from',v_old.email,'to',p_changes->>'email') END,
  'phone',CASE WHEN COALESCE(p_changes->>'phone',v_old.phone) IS DISTINCT FROM v_old.phone THEN jsonb_build_object('from',v_old.phone,'to',p_changes->>'phone') END,
  'whatsapp',CASE WHEN COALESCE(p_changes->>'whatsapp',v_old.whatsapp) IS DISTINCT FROM v_old.whatsapp THEN jsonb_build_object('from',v_old.whatsapp,'to',p_changes->>'whatsapp') END,
  'city',CASE WHEN COALESCE(p_changes->>'city',v_old.city) IS DISTINCT FROM v_old.city THEN jsonb_build_object('from',v_old.city,'to',p_changes->>'city') END,
  'state',CASE WHEN COALESCE(p_changes->>'state',v_old.state) IS DISTINCT FROM v_old.state THEN jsonb_build_object('from',v_old.state,'to',p_changes->>'state') END,
  'address',CASE WHEN COALESCE(p_changes->>'address',v_old.address) IS DISTINCT FROM v_old.address THEN jsonb_build_object('from',v_old.address,'to',p_changes->>'address') END));
 IF v_changes='{}'::jsonb THEN RETURN v_old; END IF;
 UPDATE public.customers SET name=COALESCE(NULLIF(trim(p_changes->>'name'),''),name),trade_name=CASE WHEN p_changes?'tradeName' THEN NULLIF(trim(p_changes->>'tradeName'),'') ELSE trade_name END,document=v_document,email=CASE WHEN p_changes?'email' THEN NULLIF(trim(p_changes->>'email'),'') ELSE email END,phone=CASE WHEN p_changes?'phone' THEN NULLIF(trim(p_changes->>'phone'),'') ELSE phone END,whatsapp=CASE WHEN p_changes?'whatsapp' THEN NULLIF(trim(p_changes->>'whatsapp'),'') ELSE whatsapp END,city=CASE WHEN p_changes?'city' THEN NULLIF(trim(p_changes->>'city'),'') ELSE city END,state=CASE WHEN p_changes?'state' THEN upper(NULLIF(trim(p_changes->>'state'),'')) ELSE state END,address=CASE WHEN p_changes?'address' THEN NULLIF(trim(p_changes->>'address'),'') ELSE address END,updated_at=now() WHERE id=p_customer_id RETURNING * INTO v_new;
 SELECT full_name INTO v_actor FROM public.profiles WHERE id=auth.uid();
 INSERT INTO public.customer_change_history(tenant_id,customer_id,ticket_id,changed_by,changed_by_name,reason,changes) VALUES(v_tenant,p_customer_id,p_ticket_id,auth.uid(),COALESCE(v_actor,'Usuário'),trim(p_reason),v_changes);
 INSERT INTO public.audit_logs(tenant_id,user_id,user_email,action,entity,entity_id,details) SELECT v_tenant,auth.uid(),email,'CUSTOMER_UPDATED','CUSTOMER',p_customer_id,jsonb_build_object('ticket_id',p_ticket_id,'reason',trim(p_reason),'changes',v_changes) FROM public.profiles WHERE id=auth.uid();
 RETURN v_new;
END $$;
REVOKE ALL ON FUNCTION public.update_customer_controlled(uuid,uuid,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_customer_controlled(uuid,uuid,jsonb,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.close_ticket_controlled(p_ticket_id uuid,p_procedency text,p_final_opinion text,p_resolved_at timestamptz,p_closed_at timestamptz,p_notes text) RETURNS public.tickets
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
DECLARE v_tenant uuid:=public.user_tenant_id(); v_role text:=public.user_role_code(); v_ticket public.tickets; v_result public.tickets; v_status text; v_actor text;
BEGIN
 IF auth.uid() IS NULL OR v_tenant IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Sessão inválida.'; END IF;
 IF v_role NOT IN ('SUPERADMIN','ADMIN_EMPRESA','DIRETORIA','RESPONSAVEL_TECNICA','SAC') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Perfil sem permissão para encerrar SAC.'; END IF;
 SELECT * INTO v_ticket FROM public.tickets WHERE id=p_ticket_id AND tenant_id=v_tenant FOR UPDATE;
 IF v_ticket.id IS NULL THEN RAISE EXCEPTION 'SAC não encontrado.'; END IF;
 IF upper(p_procedency) NOT IN ('PROCEDENT','NON_PROCEDENT','CANCELLED') THEN RAISE EXCEPTION 'Classificação final inválida.'; END IF;
 IF COALESCE(trim(p_final_opinion),'')='' THEN RAISE EXCEPTION 'Parecer final é obrigatório.'; END IF;
 IF COALESCE(p_closed_at,now())<v_ticket.created_at THEN RAISE EXCEPTION 'Data de encerramento não pode ser anterior à abertura.'; END IF;
 v_status:=CASE upper(p_procedency) WHEN 'PROCEDENT' THEN 'CLOSED_PROCEDENT' ELSE 'CLOSED_NON_PROCEDENT' END;
 SELECT full_name INTO v_actor FROM public.profiles WHERE id=auth.uid();
 UPDATE public.tickets SET status=v_status,final_procedency=upper(p_procedency),final_opinion=trim(p_final_opinion),resolved_at=COALESCE(p_resolved_at,v_ticket.resolved_at,p_closed_at,now()),closed_at=COALESCE(p_closed_at,now()),updated_at=now() WHERE id=p_ticket_id RETURNING * INTO v_result;
 INSERT INTO public.ticket_status_history(ticket_id,previous_status,new_status,changed_by,changed_by_name,notes) VALUES(p_ticket_id,v_ticket.status,v_status,auth.uid(),COALESCE(v_actor,'Usuário'),COALESCE(NULLIF(trim(p_notes),''),trim(p_final_opinion)));
 INSERT INTO public.audit_logs(tenant_id,user_id,user_email,action,entity,entity_id,details) SELECT v_tenant,auth.uid(),email,'TICKET_CLOSED','TICKET',p_ticket_id,jsonb_build_object('previous_status',v_ticket.status,'new_status',v_status,'final_procedency',upper(p_procedency),'resolved_at',v_result.resolved_at,'closed_at',v_result.closed_at,'final_opinion',trim(p_final_opinion)) FROM public.profiles WHERE id=auth.uid();
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.close_ticket_controlled(uuid,text,text,timestamptz,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.close_ticket_controlled(uuid,text,text,timestamptz,timestamptz,text) TO authenticated;

INSERT INTO public.ticket_events(tenant_id,ticket_id,event_type,title,description,actor_id,actor_name,source_type,source_id,metadata,occurred_at)
SELECT t.tenant_id,h.ticket_id,CASE WHEN h.new_status='QUALIFICATION_UPDATE' THEN 'QUALIFICATION' ELSE 'STATUS' END,CASE WHEN h.new_status='QUALIFICATION_UPDATE' THEN 'Qualificação atualizada' ELSE 'Status alterado' END,h.notes,h.changed_by,h.changed_by_name,'ticket_status_history',h.id,jsonb_build_object('previous_status',h.previous_status,'new_status',h.new_status),h.created_at FROM public.ticket_status_history h JOIN public.tickets t ON t.id=h.ticket_id ON CONFLICT DO NOTHING;
INSERT INTO public.ticket_events(tenant_id,ticket_id,event_type,title,description,actor_id,actor_name,source_type,source_id,metadata,occurred_at)
SELECT t.tenant_id,c.ticket_id,'COMMENT','Comentário registrado',c.content,c.author_id,c.author_name,'ticket_comments',c.id,jsonb_build_object('internal',c.is_internal,'comment_type',c.comment_type),c.created_at FROM public.ticket_comments c JOIN public.tickets t ON t.id=c.ticket_id ON CONFLICT DO NOTHING;
INSERT INTO public.ticket_events(tenant_id,ticket_id,event_type,title,description,actor_id,actor_name,source_type,source_id,metadata,occurred_at)
SELECT a.tenant_id,a.ticket_id,'ATTACHMENT','Anexo adicionado',a.file_name,a.uploaded_by,p.full_name,'ticket_attachments',a.id,jsonb_build_object('file_type',a.file_type,'file_size',a.file_size,'document_type',a.document_type),a.created_at FROM public.ticket_attachments a LEFT JOIN public.profiles p ON p.id=a.uploaded_by ON CONFLICT DO NOTHING;
