alter table public.products add column if not exists image_url text;

comment on column public.products.image_url is 'URL da imagem oficial do produto usada no catálogo, SAC e inteligência de produto.';

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
  if v_profile.role_code not in ('SUPERADMIN','RESPONSAVEL_TECNICA','ADMIN_EMPRESA') then raise exception 'Perfil sem permissão para cadastrar produtos'; end if;
  v_sku=upper(trim(coalesce(p_product->>'codeSku','')));
  v_name=trim(coalesce(p_product->>'name',''));
  if v_sku='' then raise exception 'SKU é obrigatório'; end if;
  if v_name='' then raise exception 'Nome do produto é obrigatório'; end if;
  if exists(select 1 from public.products where tenant_id=v_profile.tenant_id and upper(code_sku)=v_sku) then raise exception 'Já existe produto com este SKU'; end if;
  insert into public.products(tenant_id,code_sku,name,description,model,anvisa_register,supplier_name,country_origin,brand,manufacturer_name,importer_name,distributor_name,image_url,is_active,updated_at)
  values(v_profile.tenant_id,v_sku,v_name,nullif(trim(p_product->>'description'),''),nullif(trim(p_product->>'model'),''),nullif(trim(p_product->>'anvisaRegister'),''),nullif(trim(p_product->>'supplierName'),''),nullif(trim(p_product->>'countryOrigin'),''),nullif(trim(p_product->>'brand'),''),nullif(trim(p_product->>'manufacturerName'),''),nullif(trim(p_product->>'importerName'),''),nullif(trim(p_product->>'distributorName'),''),nullif(trim(p_product->>'imageUrl'),''),true,now())
  returning * into v_product;
  insert into public.audit_logs(tenant_id,user_id,user_email,action,entity,entity_id,details)
  values(v_product.tenant_id,v_profile.id,v_profile.email,'PRODUCT_MASTER_CREATED','PRODUCT',v_product.id,to_jsonb(v_product));
  return v_product;
end $$;

create or replace function public.update_product_master(p_product_id uuid,p_changes jsonb)
returns public.products
language plpgsql
security definer
set search_path=public
as $$
declare
  v_profile public.profiles%rowtype;
  v_product public.products%rowtype;
  v_before public.products%rowtype;
begin
  select * into v_profile from public.profiles where id=auth.uid() and is_active=true;
  if not found then raise exception 'Usuário não autenticado ou inativo'; end if;
  if v_profile.role_code not in ('SUPERADMIN','RESPONSAVEL_TECNICA','ADMIN_EMPRESA') then raise exception 'Perfil sem permissão para alterar produtos'; end if;
  select * into v_before from public.products where id=p_product_id and (v_profile.role_code='SUPERADMIN' or tenant_id=v_profile.tenant_id);
  if not found then raise exception 'Produto não encontrado ou fora da empresa'; end if;
  update public.products set
    code_sku=coalesce(nullif(upper(trim(p_changes->>'codeSku')),''),code_sku),
    name=coalesce(nullif(trim(p_changes->>'name'),''),name),
    description=case when p_changes ? 'description' then nullif(trim(p_changes->>'description'),'') else description end,
    model=case when p_changes ? 'model' then nullif(trim(p_changes->>'model'),'') else model end,
    anvisa_register=case when p_changes ? 'anvisaRegister' then nullif(trim(p_changes->>'anvisaRegister'),'') else anvisa_register end,
    supplier_name=case when p_changes ? 'supplierName' then nullif(trim(p_changes->>'supplierName'),'') else supplier_name end,
    country_origin=case when p_changes ? 'countryOrigin' then nullif(trim(p_changes->>'countryOrigin'),'') else country_origin end,
    brand=case when p_changes ? 'brand' then nullif(trim(p_changes->>'brand'),'') else brand end,
    manufacturer_name=case when p_changes ? 'manufacturerName' then nullif(trim(p_changes->>'manufacturerName'),'') else manufacturer_name end,
    importer_name=case when p_changes ? 'importerName' then nullif(trim(p_changes->>'importerName'),'') else importer_name end,
    distributor_name=case when p_changes ? 'distributorName' then nullif(trim(p_changes->>'distributorName'),'') else distributor_name end,
    image_url=case when p_changes ? 'imageUrl' then nullif(trim(p_changes->>'imageUrl'),'') else image_url end,
    updated_at=now()
  where id=p_product_id returning * into v_product;
  insert into public.audit_logs(tenant_id,user_id,user_email,action,entity,entity_id,details)
  values(v_product.tenant_id,v_profile.id,v_profile.email,'PRODUCT_MASTER_UPDATED','PRODUCT',v_product.id,jsonb_build_object('before',to_jsonb(v_before),'after',to_jsonb(v_product)));
  return v_product;
end $$;

revoke all on function public.create_product_master(jsonb) from public;
revoke all on function public.update_product_master(uuid,jsonb) from public;
grant execute on function public.create_product_master(jsonb) to authenticated;
grant execute on function public.update_product_master(uuid,jsonb) to authenticated;
