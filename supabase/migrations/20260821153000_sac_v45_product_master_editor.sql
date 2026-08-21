create or replace function public.update_product_master(p_product_id uuid, p_changes jsonb)
returns public.products
language plpgsql
security definer
set search_path=public
as $$
declare
  v_profile public.profiles%rowtype;
  v_product public.products%rowtype;
  v_updated public.products%rowtype;
begin
  select * into v_profile from public.profiles where id=auth.uid() and is_active=true;
  if not found then raise exception 'Usuário não autenticado ou inativo'; end if;
  if v_profile.role_code not in ('SUPERADMIN','RESPONSAVEL_TECNICA','ADMIN_EMPRESA') then
    raise exception 'Perfil sem permissão para editar o cadastro mestre de produtos';
  end if;
  select * into v_product from public.products where id=p_product_id;
  if not found then raise exception 'Produto não encontrado'; end if;
  if v_profile.role_code <> 'SUPERADMIN' and v_product.tenant_id <> v_profile.tenant_id then raise exception 'Produto fora da empresa do usuário'; end if;
  update public.products set
    name=coalesce(nullif(trim(p_changes->>'name'),''),name),
    description=case when p_changes?'description' then nullif(trim(p_changes->>'description'),'') else description end,
    model=case when p_changes?'model' then nullif(trim(p_changes->>'model'),'') else model end,
    code_sku=coalesce(nullif(trim(p_changes->>'codeSku'),''),code_sku),
    brand=case when p_changes?'brand' then nullif(trim(p_changes->>'brand'),'') else brand end,
    anvisa_register=case when p_changes?'anvisaRegister' then nullif(trim(p_changes->>'anvisaRegister'),'') else anvisa_register end,
    manufacturer_name=case when p_changes?'manufacturerName' then nullif(trim(p_changes->>'manufacturerName'),'') else manufacturer_name end,
    importer_name=case when p_changes?'importerName' then nullif(trim(p_changes->>'importerName'),'') else importer_name end,
    distributor_name=case when p_changes?'distributorName' then nullif(trim(p_changes->>'distributorName'),'') else distributor_name end,
    country_origin=case when p_changes?'countryOrigin' then nullif(trim(p_changes->>'countryOrigin'),'') else country_origin end
  where id=p_product_id returning * into v_updated;
  insert into public.audit_logs(tenant_id,user_id,user_email,action,entity,entity_id,details)
  values(v_updated.tenant_id,v_profile.id,v_profile.email,'PRODUCT_MASTER_UPDATED','PRODUCT',v_updated.id,jsonb_build_object('before',to_jsonb(v_product),'after',to_jsonb(v_updated),'fields',p_changes));
  return v_updated;
end $$;
revoke all on function public.update_product_master(uuid,jsonb) from public;
grant execute on function public.update_product_master(uuid,jsonb) to authenticated;
