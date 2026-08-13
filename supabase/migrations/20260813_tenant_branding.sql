create table if not exists public.tenant_branding (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  logo_path text,
  primary_color text not null default '#145EDB' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#0B2343' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#22D3EE' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  text_color text not null default '#10233F' check (text_color ~ '^#[0-9A-Fa-f]{6}$'),
  document_footer text check (document_footer is null or char_length(document_footer)<=500),
  show_powered_by boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tenant_branding enable row level security;
alter table public.tenant_branding force row level security;
create policy tenant_branding_read on public.tenant_branding for select to authenticated using (tenant_id=public.user_tenant_id());
create policy tenant_branding_admin_insert on public.tenant_branding for insert to authenticated
  with check (tenant_id=public.user_tenant_id() and public.user_role_code() in ('SUPERADMIN','ADMIN_EMPRESA'));
create policy tenant_branding_admin_update on public.tenant_branding for update to authenticated
  using (tenant_id=public.user_tenant_id() and public.user_role_code() in ('SUPERADMIN','ADMIN_EMPRESA'))
  with check (tenant_id=public.user_tenant_id() and public.user_role_code() in ('SUPERADMIN','ADMIN_EMPRESA'));
revoke all on public.tenant_branding from anon;
grant select on public.tenant_branding to authenticated;
grant insert,update on public.tenant_branding to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('tenant-branding','tenant-branding',true,2097152,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=true,file_size_limit=2097152,allowed_mime_types=excluded.allowed_mime_types;

create policy tenant_branding_logo_read on storage.objects for select to public using(bucket_id='tenant-branding');
create policy tenant_branding_logo_insert on storage.objects for insert to authenticated
  with check(bucket_id='tenant-branding' and (storage.foldername(name))[1]=public.user_tenant_id()::text and public.user_role_code() in ('SUPERADMIN','ADMIN_EMPRESA'));
create policy tenant_branding_logo_update on storage.objects for update to authenticated
  using(bucket_id='tenant-branding' and (storage.foldername(name))[1]=public.user_tenant_id()::text and public.user_role_code() in ('SUPERADMIN','ADMIN_EMPRESA'))
  with check(bucket_id='tenant-branding' and (storage.foldername(name))[1]=public.user_tenant_id()::text and public.user_role_code() in ('SUPERADMIN','ADMIN_EMPRESA'));

comment on table public.tenant_branding is 'Identidade visual isolada por tenant para telas e documentos gerados.';
