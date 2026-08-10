create table if not exists public.commercial_orders (
  id uuid primary key default gen_random_uuid(),
  trial_request_id uuid not null unique references public.commercial_trial_requests(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  plan_code text not null check (plan_code in ('START','PRO','ENTERPRISE')),
  company_document text not null check (company_document ~ '^[0-9]{14}$'),
  buyer_email text not null,
  contract_evidence_reference text not null,
  contract_version text not null,
  contract_accepted_at timestamptz not null,
  contract_confirmed_by uuid not null references auth.users(id) on delete restrict,
  expected_amount numeric(12,2) not null check (expected_amount > 0),
  currency text not null default 'BRL' check (currency='BRL'),
  status text not null default 'APPROVED' check (status in ('APPROVED','PAYMENT_PENDING','PAYMENT_REVIEW','PAID','CANCELED')),
  checkout_token uuid not null unique default gen_random_uuid(),
  checkout_preference_id text,
  checkout_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.commercial_payments add column if not exists order_id uuid references public.commercial_orders(id) on delete set null;
create index if not exists idx_commercial_orders_status on public.commercial_orders(status,created_at desc);
create index if not exists idx_commercial_payments_order on public.commercial_payments(order_id);

alter table public.commercial_orders enable row level security;
alter table public.commercial_orders force row level security;
revoke all on public.commercial_orders from anon,authenticated;

comment on table public.commercial_orders is 'Pedidos anuais conciliados com trial, tenant, CNPJ, contrato e pagamento.';
