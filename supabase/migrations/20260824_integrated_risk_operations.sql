-- SAC 4.0 - operação modular e integrada: SAC > risco > contenção > CAPA > auditoria.
create extension if not exists pgcrypto;

create table if not exists public.tenant_modules (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  module_code text not null check (module_code in ('SAC','QUALITY','TRACEABILITY','RISK','CAPA','REGULATORY','AUDIT_OCP')),
  enabled boolean not null default true,
  source text not null default 'PLAN' check (source in ('PLAN','OVERRIDE','TRIAL')),
  configuration jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (tenant_id,module_code)
);

create table if not exists public.risk_watchers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  risk_case_id uuid not null references public.risk_cases(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text,
  responsibility text not null default 'FOLLOW_UP',
  notify_in_app boolean not null default true,
  notify_email boolean not null default true,
  created_at timestamptz not null default now(),
  unique (risk_case_id,profile_id)
);

create table if not exists public.operational_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  module_code text not null,
  entity_type text not null,
  entity_id uuid,
  severity text not null check (severity in ('INFO','ATTENTION','HIGH','CRITICAL')),
  title text not null,
  message text not null,
  recipient_profile_id uuid references public.profiles(id) on delete set null,
  recipient_name text,
  recipient_email text,
  due_at timestamptz,
  status text not null default 'OPEN' check (status in ('OPEN','READ','ACKNOWLEDGED','RESOLVED','CANCELLED')),
  delivery_status text not null default 'PENDING' check (delivery_status in ('PENDING','QUEUED','SENT','FAILED','NOT_APPLICABLE')),
  delivery_error text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id,module_code,entity_type,entity_id,recipient_profile_id,title)
);

create table if not exists public.audit_organizations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  legal_name text not null,
  trade_name text,
  document text,
  organization_type text not null default 'OCP' check (organization_type in ('OCP','ANVISA','INMETRO','INTERNAL','CUSTOMER','OTHER')),
  accreditation_reference text,
  contact_name text,
  contact_email text,
  contact_phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.compliance_audits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid references public.audit_organizations(id) on delete set null,
  code text not null,
  audit_type text not null default 'OCP',
  title text not null,
  scope text not null,
  company_group text,
  lead_auditor text,
  responsible_profile_id uuid references public.profiles(id) on delete set null,
  start_date date,
  end_date date,
  next_audit_date date,
  status text not null default 'PLANNED' check (status in ('PLANNED','PREPARATION','IN_PROGRESS','ACTION_PLAN','COMPLETED','CANCELLED')),
  conclusion text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,code)
);

create table if not exists public.audit_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  audit_id uuid references public.compliance_audits(id) on delete cascade,
  risk_case_id uuid references public.risk_cases(id) on delete set null,
  document_type text not null,
  title text not null,
  reference text,
  issuer text,
  issued_at date,
  valid_until date,
  file_name text,
  file_path text,
  mime_type text,
  status text not null default 'VALID' check (status in ('DRAFT','VALID','EXPIRING','EXPIRED','REVOKED')),
  responsible_profile_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quarantine_cases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  risk_case_id uuid references public.risk_cases(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  product_lot_id uuid references public.product_lots(id) on delete set null,
  lot_number text,
  reason text not null,
  quantity integer not null default 0 check (quantity >= 0),
  location text,
  owner_profile_id uuid references public.profiles(id) on delete set null,
  owner_name text not null,
  due_at timestamptz,
  customer_return_required boolean not null default false,
  customer_feedback text,
  status text not null default 'OPEN' check (status in ('OPEN','COLLECTION_PENDING','QUARANTINED','RELEASED','BLOCKED','RECALLED','CLOSED')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,ticket_id,lot_number)
);

create index if not exists operational_alerts_recipient_idx on public.operational_alerts(tenant_id,recipient_profile_id,status,created_at desc);
create index if not exists audit_documents_expiry_idx on public.audit_documents(tenant_id,valid_until,status);
create index if not exists quarantine_cases_status_idx on public.quarantine_cases(tenant_id,status,due_at);

-- Compatibilidade e edição do registro de risco.
alter table public.risk_cases add column if not exists customer_feedback_due_at timestamptz;
alter table public.risk_cases add column if not exists customer_feedback_status text not null default 'PENDING';
alter table public.risk_cases add column if not exists audit_id uuid references public.compliance_audits(id) on delete set null;
alter table public.risk_cases add column if not exists updated_by uuid references public.profiles(id) on delete set null;

-- Grade comercial progressiva; o superadmin pode sobrescrever por contrato.
update public.saas_plans set features = features || case code
  when 'START' then '{"modules":["SAC"]}'::jsonb
  when 'PRO' then '{"modules":["SAC","QUALITY","TRACEABILITY","RISK","CAPA","REGULATORY"]}'::jsonb
  when 'ENTERPRISE' then '{"modules":["SAC","QUALITY","TRACEABILITY","RISK","CAPA","REGULATORY","AUDIT_OCP"]}'::jsonb
  else '{}'::jsonb end;

insert into public.tenant_modules(tenant_id,module_code,enabled,source)
select t.id,m.code,true,'PLAN'
from public.tenants t
join public.tenant_subscriptions s on s.tenant_id=t.id
join public.saas_plans p on p.id=s.plan_id
cross join lateral jsonb_array_elements_text(coalesce(p.features->'modules','["SAC"]'::jsonb)) m(code)
on conflict (tenant_id,module_code) do nothing;

create or replace function public.module_enabled(p_tenant uuid,p_module text) returns boolean
language sql stable security definer set search_path=pg_catalog,public set row_security=off as $$
  select coalesce((select enabled from public.tenant_modules where tenant_id=p_tenant and module_code=p_module),p_module='SAC')
$$;

create or replace function public.queue_risk_alerts(p_risk uuid,p_title text,p_message text,p_severity text default 'ATTENTION') returns void
language plpgsql security definer set search_path=pg_catalog,public set row_security=off as $$
declare r public.risk_cases%rowtype;
begin
  select * into r from public.risk_cases where id=p_risk;
  if r.id is null then return; end if;
  insert into public.operational_alerts(tenant_id,module_code,entity_type,entity_id,severity,title,message,recipient_profile_id,recipient_name,recipient_email,delivery_status)
  select r.tenant_id,'RISK','RISK_CASE',r.id,p_severity,p_title,p_message,w.profile_id,w.name,w.email,
    case when w.notify_email and w.email is not null then 'QUEUED' else 'NOT_APPLICABLE' end
  from public.risk_watchers w where w.risk_case_id=r.id and w.notify_in_app
  on conflict do nothing;
end $$;

create or replace function public.open_integrated_risk_case(
  p_ticket uuid,p_title text,p_hazard text,p_harm text,p_severity smallint,p_probability smallint,
  p_detectability smallint default 3,p_controls text default null,p_owner uuid default null,
  p_quarantine boolean default false,p_quarantine_reason text default null,p_feedback_days integer default 2
) returns uuid language plpgsql security definer set search_path=pg_catalog,public set row_security=off as $$
declare t public.tickets%rowtype; i record; actor public.profiles%rowtype; risk_id uuid; owner_row public.profiles%rowtype; risk_code text;
begin
  select * into actor from public.profiles where id=auth.uid() and is_active=true;
  select * into t from public.tickets where id=p_ticket and tenant_id=actor.tenant_id;
  if t.id is null then raise exception 'SAC não encontrado ou fora da empresa atual.'; end if;
  if not public.module_enabled(t.tenant_id,'RISK') then raise exception 'Módulo Gestão de Riscos não contratado para esta empresa.'; end if;
  if actor.role_code not in ('SUPERADMIN','DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA','SAC','TECNICO') then raise exception 'Perfil sem permissão para iniciar avaliação de risco.'; end if;
  select * into owner_row from public.profiles where id=coalesce(p_owner,auth.uid()) and tenant_id=t.tenant_id and is_active=true;
  select ti.product_id,ti.lot_number into i from public.ticket_items ti where ti.ticket_id=t.id order by ti.created_at limit 1;
  risk_code := 'RIS-' || to_char(clock_timestamp(),'YYMMDDHH24MISSMS');
  insert into public.risk_cases(tenant_id,code,ticket_id,product_id,lot_number,source,title,hazard,harm,severity,probability,detectability,controls,status,owner_id,owner_name,created_by,customer_feedback_due_at)
  values(t.tenant_id,risk_code,t.id,i.product_id,i.lot_number,'SAC',trim(p_title),trim(p_hazard),trim(p_harm),p_severity,p_probability,p_detectability,nullif(trim(p_controls),''),'UNDER_EVALUATION',owner_row.id,owner_row.full_name,auth.uid(),now()+make_interval(days=>greatest(p_feedback_days,1))) returning id into risk_id;
  insert into public.risk_watchers(tenant_id,risk_case_id,profile_id,name,email,responsibility)
  select t.tenant_id,risk_id,p.id,p.full_name,p.email,case when p.id=actor.id then 'OPENED_BY' else 'RESPONSAVEL_TECNICA' end
  from public.profiles p where p.tenant_id=t.tenant_id and p.is_active=true and (p.id=actor.id or p.id=owner_row.id or p.role_code='RESPONSAVEL_TECNICA') on conflict do nothing;
  if p_quarantine then
    if not public.module_enabled(t.tenant_id,'TRACEABILITY') then raise exception 'Quarentena exige o módulo Rastreabilidade.'; end if;
    insert into public.quarantine_cases(tenant_id,ticket_id,risk_case_id,product_id,product_lot_id,lot_number,reason,quantity,owner_profile_id,owner_name,due_at,customer_return_required,created_by)
    select t.tenant_id,t.id,risk_id,i.product_id,pl.id,i.lot_number,coalesce(nullif(trim(p_quarantine_reason),''),trim(p_hazard)),coalesce((select sum(quantity) from public.ticket_items where ticket_id=t.id),0),owner_row.id,owner_row.full_name,now()+interval '1 day',true,auth.uid()
    from (select 1) x left join public.product_lots pl on pl.tenant_id=t.tenant_id and pl.product_id=i.product_id and pl.lot_number=i.lot_number;
    update public.product_lots set status='QUARANTINE',updated_at=now() where tenant_id=t.tenant_id and product_id=i.product_id and lot_number=i.lot_number;
  end if;
  perform public.queue_risk_alerts(risk_id,'Novo risco vinculado ao '||t.protocol,'Avaliação aberta: '||trim(p_title),case when p_quarantine then 'CRITICAL' else 'HIGH' end);
  return risk_id;
end $$;

create or replace function public.refresh_operational_deadline_alerts() returns integer
language plpgsql security definer set search_path=pg_catalog,public set row_security=off as $$
declare total integer;
begin
  insert into public.operational_alerts(tenant_id,module_code,entity_type,entity_id,severity,title,message,recipient_profile_id,recipient_name,recipient_email,due_at,delivery_status)
  select d.tenant_id,'AUDIT_OCP','AUDIT_DOCUMENT',d.id,case when d.valid_until<current_date then 'CRITICAL' else 'ATTENTION' end,
    case when d.valid_until<current_date then 'Documento vencido' else 'Documento próximo do vencimento' end,
    d.title||' - validade '||to_char(d.valid_until,'DD/MM/YYYY'),p.id,p.full_name,p.email,d.valid_until::timestamptz,case when p.email is null then 'NOT_APPLICABLE' else 'QUEUED' end
  from public.audit_documents d left join public.profiles p on p.id=d.responsible_profile_id
  where d.valid_until is not null and d.valid_until<=current_date+30 and d.status not in ('REVOKED','DRAFT')
  on conflict do nothing;
  get diagnostics total=row_count;
  update public.audit_documents set status=case when valid_until<current_date then 'EXPIRED' when valid_until<=current_date+30 then 'EXPIRING' else status end where valid_until<=current_date+30;
  return total;
end $$;

alter table public.tenant_modules enable row level security;
alter table public.risk_watchers enable row level security;
alter table public.operational_alerts enable row level security;
alter table public.audit_organizations enable row level security;
alter table public.compliance_audits enable row level security;
alter table public.audit_documents enable row level security;
alter table public.quarantine_cases enable row level security;

do $$ declare tbl text; begin
  foreach tbl in array array['tenant_modules','risk_watchers','operational_alerts','audit_organizations','compliance_audits','audit_documents','quarantine_cases'] loop
    execute format('drop policy if exists %I on public.%I',tbl||'_tenant_read',tbl);
    execute format('create policy %I on public.%I for select to authenticated using (tenant_id=public.user_tenant_id() or public.user_role_code()=''SUPERADMIN'')',tbl||'_tenant_read',tbl);
  end loop;
end $$;

drop policy if exists audit_organizations_tenant_read on public.audit_organizations;
create policy audit_organizations_tenant_read on public.audit_organizations for select to authenticated using (tenant_id=public.user_tenant_id() and public.user_role_code() in ('SUPERADMIN','DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA'));
drop policy if exists compliance_audits_tenant_read on public.compliance_audits;
create policy compliance_audits_tenant_read on public.compliance_audits for select to authenticated using (tenant_id=public.user_tenant_id() and public.user_role_code() in ('SUPERADMIN','DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA'));
drop policy if exists audit_documents_tenant_read on public.audit_documents;
create policy audit_documents_tenant_read on public.audit_documents for select to authenticated using (tenant_id=public.user_tenant_id() and public.user_role_code() in ('SUPERADMIN','DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA'));

create policy risk_watchers_manage on public.risk_watchers for all to authenticated using (tenant_id=public.user_tenant_id() and public.user_role_code() in ('SUPERADMIN','DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA')) with check (tenant_id=public.user_tenant_id());
create policy alerts_update_own on public.operational_alerts for update to authenticated using (tenant_id=public.user_tenant_id() and (recipient_profile_id=auth.uid() or public.user_role_code() in ('SUPERADMIN','DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA'))) with check (tenant_id=public.user_tenant_id());
create policy audit_org_manage on public.audit_organizations for all to authenticated using (tenant_id=public.user_tenant_id() and public.user_role_code() in ('SUPERADMIN','RESPONSAVEL_TECNICA','ADMIN_EMPRESA')) with check (tenant_id=public.user_tenant_id());
create policy audits_manage on public.compliance_audits for all to authenticated using (tenant_id=public.user_tenant_id() and public.user_role_code() in ('SUPERADMIN','RESPONSAVEL_TECNICA','ADMIN_EMPRESA')) with check (tenant_id=public.user_tenant_id());
create policy audit_docs_manage on public.audit_documents for all to authenticated using (tenant_id=public.user_tenant_id() and public.user_role_code() in ('SUPERADMIN','RESPONSAVEL_TECNICA','ADMIN_EMPRESA')) with check (tenant_id=public.user_tenant_id());
create policy quarantine_manage on public.quarantine_cases for all to authenticated using (tenant_id=public.user_tenant_id() and public.user_role_code() in ('SUPERADMIN','DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA','SAC','TECNICO')) with check (tenant_id=public.user_tenant_id());
create policy tenant_modules_superadmin_manage on public.tenant_modules for all to authenticated using (public.user_role_code()='SUPERADMIN') with check (public.user_role_code()='SUPERADMIN');

drop policy if exists risk_cases_tenant_write on public.risk_cases;
drop policy if exists risk_cases_tenant_read on public.risk_cases;
create policy risk_cases_tenant_read on public.risk_cases for select to authenticated
  using (tenant_id=public.user_tenant_id() and public.module_enabled(tenant_id,'RISK') and public.user_role_code() in ('SUPERADMIN','DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA','SAC','TECNICO'));
create policy risk_cases_tenant_write on public.risk_cases for all to authenticated
  using (tenant_id=public.user_tenant_id() and public.user_role_code() in ('SUPERADMIN','DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA'))
  with check (tenant_id=public.user_tenant_id() and public.user_role_code() in ('SUPERADMIN','DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA'));
drop policy if exists risk_actions_tenant_write on public.risk_actions;
drop policy if exists risk_actions_tenant_read on public.risk_actions;
create policy risk_actions_tenant_read on public.risk_actions for select to authenticated
  using (tenant_id=public.user_tenant_id() and public.module_enabled(tenant_id,'CAPA') and public.user_role_code() in ('SUPERADMIN','DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA','SAC','TECNICO'));
create policy risk_actions_tenant_write on public.risk_actions for all to authenticated
  using (tenant_id=public.user_tenant_id() and public.user_role_code() in ('SUPERADMIN','DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA'))
  with check (tenant_id=public.user_tenant_id() and public.user_role_code() in ('SUPERADMIN','DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA'));

grant select on public.tenant_modules,public.risk_watchers,public.operational_alerts,public.audit_organizations,public.compliance_audits,public.audit_documents,public.quarantine_cases to authenticated;
grant insert,update on public.risk_watchers,public.operational_alerts,public.audit_organizations,public.compliance_audits,public.audit_documents,public.quarantine_cases to authenticated;
revoke all on function public.queue_risk_alerts(uuid,text,text,text),public.refresh_operational_deadline_alerts() from public,anon;
grant execute on function public.module_enabled(uuid,text),public.open_integrated_risk_case(uuid,text,text,text,smallint,smallint,smallint,text,uuid,boolean,text,integer),public.refresh_operational_deadline_alerts() to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('risk-audit-documents','risk-audit-documents',false,26214400,array['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do nothing;
create policy risk_audit_documents_read on storage.objects for select to authenticated using (bucket_id='risk-audit-documents' and (storage.foldername(name))[1]=public.user_tenant_id()::text);
create policy risk_audit_documents_write on storage.objects for insert to authenticated with check (bucket_id='risk-audit-documents' and (storage.foldername(name))[1]=public.user_tenant_id()::text and public.user_role_code() in ('SUPERADMIN','RESPONSAVEL_TECNICA','ADMIN_EMPRESA'));
