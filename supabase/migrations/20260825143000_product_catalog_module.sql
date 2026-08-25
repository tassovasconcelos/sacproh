alter table public.products add column if not exists description text;
alter table public.products add column if not exists brand varchar(120);
alter table public.products add column if not exists manufacturer_name varchar(255);
alter table public.products add column if not exists importer_name varchar(255);
alter table public.products add column if not exists distributor_name varchar(255);
alter table public.products add column if not exists updated_at timestamptz default now();

create or replace function public.create_product_master(p_product jsonb)
returns public.products
language plpgsql
security definer
set search_path=public
as $$
declare
  v_profile public.profiles%rowtype;
  v_product public.products%rowtype;
  v_sku text;
  v_name text;
begin
  select * into v_profile from public.profiles where id=auth.uid() and is_active=true;
  if not found then raise exception 'Usuário não autenticado ou inativo'; end if;
  if v_profile.role_code not in ('SUPERADMIN','RESPONSAVEL_TECNICA','ADMIN_EMPRESA') then
    raise exception 'Perfil sem permissão para cadastrar produtos';
  end if;
  v_sku=upper(trim(coalesce(p_product->>'codeSku','')));
  v_name=trim(coalesce(p_product->>'name',''));
  if v_sku='' then raise exception 'SKU é obrigatório'; end if;
  if v_name='' then raise exception 'Nome do produto é obrigatório'; end if;
  if exists(select 1 from public.products where tenant_id=v_profile.tenant_id and upper(code_sku)=v_sku) then
    raise exception 'Já existe produto com este SKU';
  end if;
  insert into public.products(tenant_id,code_sku,name,description,model,anvisa_register,supplier_name,country_origin,brand,manufacturer_name,importer_name,distributor_name,is_active,updated_at)
  values(v_profile.tenant_id,v_sku,v_name,nullif(trim(p_product->>'description'),''),nullif(trim(p_product->>'model'),''),nullif(trim(p_product->>'anvisaRegister'),''),nullif(trim(p_product->>'supplierName'),''),nullif(trim(p_product->>'countryOrigin'),''),nullif(trim(p_product->>'brand'),''),nullif(trim(p_product->>'manufacturerName'),''),nullif(trim(p_product->>'importerName'),''),nullif(trim(p_product->>'distributorName'),''),true,now())
  returning * into v_product;
  insert into public.audit_logs(tenant_id,user_id,user_email,action,entity,entity_id,details)
  values(v_product.tenant_id,v_profile.id,v_profile.email,'PRODUCT_MASTER_CREATED','PRODUCT',v_product.id,to_jsonb(v_product));
  return v_product;
end $$;

create or replace function public.set_product_master_active(p_product_id uuid,p_active boolean)
returns public.products
language plpgsql
security definer
set search_path=public
as $$
declare
  v_profile public.profiles%rowtype;
  v_product public.products%rowtype;
begin
  select * into v_profile from public.profiles where id=auth.uid() and is_active=true;
  if not found then raise exception 'Usuário não autenticado ou inativo'; end if;
  if v_profile.role_code not in ('SUPERADMIN','RESPONSAVEL_TECNICA','ADMIN_EMPRESA') then raise exception 'Perfil sem permissão para alterar produtos'; end if;
  update public.products set is_active=p_active,updated_at=now()
   where id=p_product_id and (v_profile.role_code='SUPERADMIN' or tenant_id=v_profile.tenant_id)
   returning * into v_product;
  if not found then raise exception 'Produto não encontrado ou fora da empresa'; end if;
  insert into public.audit_logs(tenant_id,user_id,user_email,action,entity,entity_id,details)
  values(v_product.tenant_id,v_profile.id,v_profile.email,case when p_active then 'PRODUCT_REACTIVATED' else 'PRODUCT_DEACTIVATED' end,'PRODUCT',v_product.id,jsonb_build_object('is_active',p_active));
  return v_product;
end $$;

revoke all on function public.create_product_master(jsonb) from public;
revoke all on function public.set_product_master_active(uuid,boolean) from public;
grant execute on function public.create_product_master(jsonb) to authenticated;
grant execute on function public.set_product_master_active(uuid,boolean) to authenticated;
