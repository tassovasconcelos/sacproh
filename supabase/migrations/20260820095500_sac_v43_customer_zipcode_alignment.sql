CREATE OR REPLACE FUNCTION public.update_customer_controlled(
  p_customer_id uuid,
  p_ticket_id uuid,
  p_changes jsonb,
  p_reason text
) RETURNS public.customers
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
  'zip_code',CASE WHEN COALESCE(p_changes->>'zipCode',v_old.zip_code) IS DISTINCT FROM v_old.zip_code THEN jsonb_build_object('from',v_old.zip_code,'to',p_changes->>'zipCode') END,
  'address',CASE WHEN COALESCE(p_changes->>'address',v_old.address) IS DISTINCT FROM v_old.address THEN jsonb_build_object('from',v_old.address,'to',p_changes->>'address') END));
 IF v_changes='{}'::jsonb THEN RETURN v_old; END IF;
 UPDATE public.customers SET name=COALESCE(NULLIF(trim(p_changes->>'name'),''),name),trade_name=CASE WHEN p_changes?'tradeName' THEN NULLIF(trim(p_changes->>'tradeName'),'') ELSE trade_name END,document=v_document,email=CASE WHEN p_changes?'email' THEN NULLIF(trim(p_changes->>'email'),'') ELSE email END,phone=CASE WHEN p_changes?'phone' THEN NULLIF(trim(p_changes->>'phone'),'') ELSE phone END,whatsapp=CASE WHEN p_changes?'whatsapp' THEN NULLIF(trim(p_changes->>'whatsapp'),'') ELSE whatsapp END,city=CASE WHEN p_changes?'city' THEN NULLIF(trim(p_changes->>'city'),'') ELSE city END,state=CASE WHEN p_changes?'state' THEN upper(NULLIF(trim(p_changes->>'state'),'')) ELSE state END,zip_code=CASE WHEN p_changes?'zipCode' THEN NULLIF(trim(p_changes->>'zipCode'),'') ELSE zip_code END,address=CASE WHEN p_changes?'address' THEN NULLIF(trim(p_changes->>'address'),'') ELSE address END,updated_at=now() WHERE id=p_customer_id RETURNING * INTO v_new;
 SELECT full_name INTO v_actor FROM public.profiles WHERE id=auth.uid();
 INSERT INTO public.customer_change_history(tenant_id,customer_id,ticket_id,changed_by,changed_by_name,reason,changes) VALUES(v_tenant,p_customer_id,p_ticket_id,auth.uid(),COALESCE(v_actor,'Usuário'),trim(p_reason),v_changes);
 INSERT INTO public.audit_logs(tenant_id,user_id,user_email,action,entity,entity_id,details) SELECT v_tenant,auth.uid(),email,'CUSTOMER_UPDATED','CUSTOMER',p_customer_id,jsonb_build_object('ticket_id',p_ticket_id,'reason',trim(p_reason),'changes',v_changes) FROM public.profiles WHERE id=auth.uid();
 RETURN v_new;
END $$;
REVOKE ALL ON FUNCTION public.update_customer_controlled(uuid,uuid,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_customer_controlled(uuid,uuid,jsonb,text) TO authenticated;
