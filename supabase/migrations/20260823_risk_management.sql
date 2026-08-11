-- SAC 4.0 - Gestão de riscos, CAPA, notificações, amostragem e denominador de vendas.
create extension if not exists pgcrypto;

create table if not exists public.risk_cases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  ticket_id uuid references public.tickets(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  lot_number text,
  source text not null default 'SAC',
  title text not null,
  hazard text not null,
  hazardous_situation text,
  foreseeable_sequence text,
  harm text not null,
  severity smallint not null check (severity between 1 and 5),
  probability smallint not null check (probability between 1 and 5),
  detectability smallint not null default 3 check (detectability between 1 and 5),
  initial_score integer generated always as (severity * probability) stored,
  controls text,
  residual_severity smallint check (residual_severity between 1 and 5),
  residual_probability smallint check (residual_probability between 1 and 5),
  residual_score integer generated always as (coalesce(residual_severity, severity) * coalesce(residual_probability, probability)) stored,
  benefit_risk_rationale text,
  status text not null default 'IDENTIFIED' check (status in ('IDENTIFIED','UNDER_EVALUATION','CONTROL_PLANNED','CONTROL_IMPLEMENTED','MONITORING','CLOSED','ACCEPTED')),
  regulatory_notification_required boolean not null default false,
  notification_authority text check (notification_authority is null or notification_authority in ('ANVISA','INMETRO','OCP','OUTRA')),
  notification_status text not null default 'NOT_APPLICABLE' check (notification_status in ('NOT_APPLICABLE','UNDER_REVIEW','DUE','SUBMITTED','ACKNOWLEDGED','CLOSED')),
  notification_deadline date,
  notification_reference text,
  field_action_type text,
  recurrence_count integer not null default 0 check (recurrence_count >= 0),
  predictive_signal text,
  effectiveness_status text not null default 'PENDING' check (effectiveness_status in ('PENDING','EFFECTIVE','INEFFECTIVE','REASSESSMENT_REQUIRED')),
  effectiveness_checked_at timestamptz,
  effectiveness_evidence text,
  owner_id uuid references public.profiles(id) on delete set null,
  owner_name text,
  next_review_at date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists public.risk_actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  risk_case_id uuid not null references public.risk_cases(id) on delete cascade,
  action_type text not null check (action_type in ('CORRECTION','CONTAINMENT','CORRECTIVE','PREVENTIVE')),
  root_cause_method text,
  root_cause text,
  what_action text not null,
  why_action text not null,
  where_action text,
  when_due date not null,
  who_name text not null,
  how_action text not null,
  how_much numeric(14,2),
  status text not null default 'PLANNED' check (status in ('PLANNED','IN_PROGRESS','BLOCKED','DONE','CANCELLED')),
  effectiveness_criterion text not null,
  effectiveness_result text,
  completed_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_volume_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  import_batch uuid not null default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  product_id uuid references public.products(id) on delete set null,
  sku text not null,
  product_name text not null,
  lot_number text,
  units_sold integer not null check (units_sold >= 0),
  customers_count integer not null default 0 check (customers_count >= 0),
  revenue numeric(16,2),
  source_file text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_sampling_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  audit_type text not null check (audit_type in ('OCP','INTERNAL','SUPPLIER','REGULATORY')),
  scope text not null,
  population_size integer not null check (population_size > 0),
  sampling_method text not null,
  sample_size integer not null check (sample_size > 0 and sample_size <= population_size),
  acceptance_number integer not null default 0 check (acceptance_number >= 0),
  rejection_number integer not null default 1 check (rejection_number > 0),
  rationale text not null,
  selected_items jsonb not null default '[]'::jsonb,
  status text not null default 'DRAFT' check (status in ('DRAFT','APPROVED','IN_EXECUTION','COMPLETED','CANCELLED')),
  approved_by uuid references public.profiles(id) on delete set null,
  audit_date date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists public.risk_audit_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  report_type text not null check (report_type in ('OCP','ANVISA','INMETRO','EXECUTIVE_RISK')),
  period_start date not null,
  period_end date not null,
  title text not null,
  summary jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists risk_cases_tenant_status_idx on public.risk_cases(tenant_id,status,created_at desc);
create index if not exists risk_actions_tenant_due_idx on public.risk_actions(tenant_id,status,when_due);
create index if not exists sales_volume_tenant_period_idx on public.sales_volume_records(tenant_id,period_start,sku);
create index if not exists sampling_tenant_idx on public.audit_sampling_plans(tenant_id,created_at desc);

alter table public.risk_cases enable row level security;
alter table public.risk_actions enable row level security;
alter table public.sales_volume_records enable row level security;
alter table public.audit_sampling_plans enable row level security;
alter table public.risk_audit_snapshots enable row level security;

do $$
declare t text;
begin
  foreach t in array array['risk_cases','risk_actions','sales_volume_records','audit_sampling_plans','risk_audit_snapshots'] loop
    execute format('drop policy if exists %I on public.%I', t || '_tenant_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (tenant_id = public.user_tenant_id() and public.user_role_code() in (''SUPERADMIN'',''DIRETORIA'',''RESPONSAVEL_TECNICA'',''ADMIN_EMPRESA''))', t || '_tenant_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_tenant_write', t);
    execute format('create policy %I on public.%I for all to authenticated using (tenant_id = public.user_tenant_id() and public.user_role_code() in (''SUPERADMIN'',''RESPONSAVEL_TECNICA'')) with check (tenant_id = public.user_tenant_id() and public.user_role_code() in (''SUPERADMIN'',''RESPONSAVEL_TECNICA''))', t || '_tenant_write', t);
  end loop;
end $$;

grant select on public.risk_cases, public.risk_actions, public.sales_volume_records, public.audit_sampling_plans, public.risk_audit_snapshots to authenticated;
grant insert, update, delete on public.risk_cases, public.risk_actions, public.sales_volume_records, public.audit_sampling_plans, public.risk_audit_snapshots to authenticated;

