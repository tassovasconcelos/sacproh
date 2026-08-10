create table if not exists public.commercial_trial_requests (
  id uuid primary key default gen_random_uuid(),
  company_name text not null check (char_length(company_name) between 2 and 160),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  work_email text not null check (char_length(work_email) <= 200),
  phone text check (phone is null or char_length(phone) <= 30),
  segment text not null check (segment in ('Importador','Distribuidor','Fabricante','Indústria','Varejo','Serviços','Outro')),
  monthly_ticket_volume text not null check (monthly_ticket_volume in ('UP_TO_100','101_TO_500','501_TO_3000','OVER_3000')),
  plan_interest text not null default 'UNDECIDED' check (plan_interest in ('START','PRO','ENTERPRISE','UNDECIDED')),
  message text check (message is null or char_length(message) <= 1200),
  status text not null default 'NEW' check (status in ('NEW','QUALIFYING','DEMO_SCHEDULED','TRIAL_APPROVED','TRIAL_ACTIVE','TRIAL_REVIEW','WON','LOST','DISQUALIFIED')),
  source text not null default 'SACTRIAL_PORTAL',
  privacy_consent_at timestamptz not null,
  trial_starts_at timestamptz,
  trial_ends_at timestamptz,
  assigned_to uuid references auth.users(id) on delete set null,
  qualification_notes text,
  loss_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_trial_requests_pipeline on public.commercial_trial_requests(status, created_at desc);
create index if not exists idx_trial_requests_email on public.commercial_trial_requests(lower(work_email), created_at desc);

alter table public.commercial_trial_requests enable row level security;
alter table public.commercial_trial_requests force row level security;
revoke all on public.commercial_trial_requests from anon, authenticated;

comment on table public.commercial_trial_requests is
  'Leads e trials comerciais capturados somente pela função request-trial e administrados pelo backoffice.';
