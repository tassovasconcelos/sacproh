create schema if not exists private;

create or replace function private.sync_grit_global_superadmin_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_tenant_id uuid;
begin
  if lower(coalesce(new.email, '')) <> 'gritsolucoes@gmail.com' then
    return new;
  end if;

  select id into v_tenant_id
  from public.tenants
  where lower(coalesce(trade_name, '')) in ('procirúrgica', 'procirurgica')
  order by created_at nulls last
  limit 1;

  if v_tenant_id is null then
    raise exception 'Tenant Procirúrgica não encontrado para provisionar SUPERADMIN global';
  end if;

  insert into public.profiles (
    id, tenant_id, full_name, email, role_code, is_active,
    job_title, department, notes, updated_at
  ) values (
    new.id,
    v_tenant_id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), 'GRIT Soluções'),
    lower(new.email),
    'SUPERADMIN',
    true,
    'Superadministrador GRIT',
    'GRIT Platform',
    'Identidade global GRIT provisionada automaticamente.',
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    role_code = 'SUPERADMIN',
    is_active = true,
    job_title = excluded.job_title,
    department = excluded.department,
    notes = excluded.notes,
    updated_at = now();

  return new;
end;
$$;

revoke all on function private.sync_grit_global_superadmin_profile() from public, anon, authenticated;

drop trigger if exists trg_sync_grit_global_superadmin_profile on auth.users;
create trigger trg_sync_grit_global_superadmin_profile
after insert or update of email on auth.users
for each row
execute function private.sync_grit_global_superadmin_profile();