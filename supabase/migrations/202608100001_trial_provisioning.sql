alter table public.commercial_trial_requests
  add column if not exists company_document text,
  add column if not exists provisioned_tenant_id uuid references public.tenants(id) on delete set null,
  add column if not exists provisioned_admin_id uuid references auth.users(id) on delete set null,
  add column if not exists provisioned_at timestamptz;

create unique index if not exists uq_trial_request_provisioned_tenant
  on public.commercial_trial_requests(provisioned_tenant_id)
  where provisioned_tenant_id is not null;

create or replace function public.provision_commercial_trial(p_request_id uuid, p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public
set row_security=off
as $$
declare
  request_row public.commercial_trial_requests%rowtype;
  selected_plan public.saas_plans%rowtype;
  new_tenant_id uuid;
  normalized_document text;
  selected_code text;
begin
  select * into request_row from public.commercial_trial_requests where id=p_request_id for update;
  if request_row.id is null then raise exception 'Solicitação não encontrada.'; end if;
  if request_row.provisioned_tenant_id is not null then
    return jsonb_build_object('tenantId',request_row.provisioned_tenant_id,'alreadyProvisioned',true);
  end if;
  if request_row.status not in ('TRIAL_APPROVED','TRIAL_ACTIVE') then raise exception 'O trial precisa estar aprovado.'; end if;
  normalized_document:=regexp_replace(coalesce(request_row.company_document,''),'[^0-9]','','g');
  if normalized_document !~ '^[0-9]{14}$' then raise exception 'Informe um CNPJ válido com 14 dígitos.'; end if;
  if exists(select 1 from public.tenants where document=normalized_document) then raise exception 'Este CNPJ já possui uma empresa cadastrada.'; end if;
  selected_code:=case when request_row.plan_interest in ('START','PRO','ENTERPRISE') then request_row.plan_interest else 'PRO' end;
  select * into selected_plan from public.saas_plans where code=selected_code and is_active=true;
  if selected_plan.id is null then raise exception 'Plano comercial indisponível.'; end if;

  insert into public.tenants(name,trade_name,document,settings)
  values(request_row.company_name,request_row.company_name,normalized_document,jsonb_build_object('commercial_trial_request_id',request_row.id))
  returning id into new_tenant_id;
  insert into public.tenant_subscriptions(tenant_id,plan_id,status,seat_limit,trial_ends_at,current_period_start,current_period_end,billing_email)
  values(new_tenant_id,selected_plan.id,'TRIAL',selected_plan.included_seats,now()+interval '30 days',now(),now()+interval '30 days',request_row.work_email);
  update public.commercial_trial_requests set provisioned_tenant_id=new_tenant_id,provisioned_at=now(),status='TRIAL_ACTIVE',
    trial_starts_at=coalesce(trial_starts_at,now()),trial_ends_at=coalesce(trial_ends_at,now()+interval '30 days'),assigned_to=coalesce(assigned_to,p_actor_id),updated_at=now()
  where id=request_row.id;
  return jsonb_build_object('tenantId',new_tenant_id,'planCode',selected_code,'alreadyProvisioned',false);
end $$;

revoke all on function public.provision_commercial_trial(uuid,uuid) from public,anon,authenticated;
grant execute on function public.provision_commercial_trial(uuid,uuid) to service_role;
