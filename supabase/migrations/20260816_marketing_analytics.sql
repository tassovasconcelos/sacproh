create table if not exists public.marketing_events (
  id uuid primary key default gen_random_uuid(), event_name text not null, page_path text not null,
  source text, medium text, campaign text, referrer text, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists marketing_events_created_idx on public.marketing_events(created_at desc);
create index if not exists marketing_events_campaign_idx on public.marketing_events(campaign,source,medium);
alter table public.marketing_events enable row level security;
create policy marketing_events_public_insert on public.marketing_events for insert to anon,authenticated with check (length(event_name)<=80 and length(page_path)<=500);
create policy marketing_events_admin_read on public.marketing_events for select to authenticated using (public.user_role_code() in ('SUPERADMIN','DIRETORIA','ADMIN_EMPRESA'));
