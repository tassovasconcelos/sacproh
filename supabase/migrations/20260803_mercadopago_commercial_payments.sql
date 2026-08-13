create table if not exists public.commercial_payments (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('mercado_pago')),
  provider_payment_id text not null,
  external_reference text,
  plan_code text check (plan_code in ('START', 'PRO', 'ENTERPRISE')),
  status text not null,
  status_detail text,
  amount numeric(12,2) not null,
  currency text not null default 'BRL',
  payer_email text,
  paid_at timestamptz,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

alter table public.commercial_payments enable row level security;
revoke all on public.commercial_payments from anon, authenticated;

comment on table public.commercial_payments is
  'Pagamentos comerciais confirmados exclusivamente por webhook autenticado do provedor.';
