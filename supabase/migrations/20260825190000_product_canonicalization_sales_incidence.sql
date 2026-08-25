create table if not exists public.product_aliases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  canonical_product_id uuid not null references public.products(id) on delete cascade,
  alias_name text,
  alias_sku text,
  alias_model text,
  source text not null default 'HISTORICAL_SAC',
  confidence numeric(5,2) not null default 100 check(confidence between 0 and 100),
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint product_alias_has_value check(coalesce(nullif(btrim(alias_name),''),nullif(btrim(alias_sku),''),nullif(btrim(alias_model),'')) is not null)
);
create index if not exists idx_product_aliases_tenant_product on public.product_aliases(tenant_id,canonical_product_id);
create index if not exists idx_product_aliases_sku_norm on public.product_aliases(tenant_id,lower(btrim(alias_sku))) where alias_sku is not null;
create index if not exists idx_product_aliases_name_norm on public.product_aliases(tenant_id,lower(regexp_replace(btrim(alias_name),'[^a-zA-Z0-9]+','','g'))) where alias_name is not null;
alter table public.product_aliases enable row level security;
revoke all on public.product_aliases from anon;
grant select on public.product_aliases to authenticated;
drop policy if exists product_aliases_select_tenant on public.product_aliases;
create policy product_aliases_select_tenant on public.product_aliases for select to authenticated using (tenant_id=(select p.tenant_id from public.profiles p where p.id=auth.uid() and p.is_active=true));

alter table public.sales_volume_records add column if not exists model text;
alter table public.sales_volume_records add column if not exists brand text;
alter table public.sales_volume_records add column if not exists manufacturer_name text;
alter table public.sales_volume_records add column if not exists source_row integer;
alter table public.sales_volume_records add column if not exists imported_at timestamptz not null default now();
revoke all on public.sales_volume_records from anon;
revoke insert,update,delete,truncate on public.sales_volume_records from authenticated;
grant select on public.sales_volume_records to authenticated;
drop policy if exists sales_volume_select_tenant on public.sales_volume_records;
create policy sales_volume_select_tenant on public.sales_volume_records for select to authenticated using (tenant_id=(select p.tenant_id from public.profiles p where p.id=auth.uid() and p.is_active=true));

create or replace function public.import_sales_volume_batch(p_rows jsonb,p_source_file text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_profile public.profiles%rowtype;v_batch uuid:=gen_random_uuid();v_row jsonb;v_product public.products%rowtype;v_inserted int:=0;v_unmatched int:=0;v_rownum int:=0;v_sku text;v_name text;v_model text;v_period_start date;v_period_end date;v_units int;v_customers int;v_revenue numeric;
begin
 select * into v_profile from public.profiles where id=auth.uid() and is_active=true;
 if not found then raise exception 'Usuário não autenticado ou inativo'; end if;
 if v_profile.role_code not in ('SUPERADMIN','DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA') then raise exception 'Perfil sem permissão para importar vendas'; end if;
 if jsonb_typeof(p_rows)<>'array' then raise exception 'Arquivo de vendas inválido'; end if;
 if coalesce(jsonb_array_length(p_rows),0)>50000 then raise exception 'Limite de 50.000 linhas por importação'; end if;
 if nullif(btrim(p_source_file),'') is not null then delete from public.sales_volume_records where tenant_id=v_profile.tenant_id and source_file=p_source_file; end if;
 for v_row in select value from jsonb_array_elements(p_rows) loop
  v_rownum:=v_rownum+1;v_sku:=nullif(btrim(coalesce(v_row->>'sku',v_row->>'codigo',v_row->>'codeSku')),'');v_name:=nullif(btrim(coalesce(v_row->>'productName',v_row->>'produto',v_row->>'descricao')),'');v_model:=nullif(btrim(coalesce(v_row->>'model',v_row->>'modelo')),'');
  begin v_period_start:=coalesce(nullif(v_row->>'periodStart','')::date,nullif(v_row->>'dataInicial','')::date,nullif(v_row->>'data','')::date); exception when others then v_period_start:=null; end;
  begin v_period_end:=coalesce(nullif(v_row->>'periodEnd','')::date,nullif(v_row->>'dataFinal','')::date,v_period_start); exception when others then v_period_end:=v_period_start; end;
  begin v_units:=round(replace(replace(coalesce(v_row->>'unitsSold',v_row->>'quantidade',v_row->>'qtd','0'),'.',''),',','.')::numeric)::int; exception when others then v_units:=0; end;
  begin v_customers:=round(replace(replace(coalesce(v_row->>'customersCount',v_row->>'clientes','0'),'.',''),',','.')::numeric)::int; exception when others then v_customers:=0; end;
  begin v_revenue:=replace(replace(replace(coalesce(v_row->>'revenue',v_row->>'faturamento',v_row->>'valor',''),'R$',''),'.',''),',','.')::numeric; exception when others then v_revenue:=null; end;
  if v_period_start is null or v_units<0 or (v_sku is null and v_name is null and v_model is null) then continue; end if;
  v_product:=null;
  select p.* into v_product from public.products p where p.tenant_id=v_profile.tenant_id and ((v_sku is not null and lower(btrim(p.code_sku))=lower(v_sku)) or (v_model is not null and lower(regexp_replace(p.model,'[^a-zA-Z0-9]+','','g'))=lower(regexp_replace(v_model,'[^a-zA-Z0-9]+','','g')))) order by case when v_sku is not null and lower(btrim(p.code_sku))=lower(v_sku) then 0 else 1 end limit 1;
  if v_product.id is null then select p.* into v_product from public.product_aliases a join public.products p on p.id=a.canonical_product_id where a.tenant_id=v_profile.tenant_id and ((v_sku is not null and a.alias_sku is not null and lower(btrim(a.alias_sku))=lower(v_sku)) or (v_name is not null and a.alias_name is not null and lower(regexp_replace(a.alias_name,'[^a-zA-Z0-9]+','','g'))=lower(regexp_replace(v_name,'[^a-zA-Z0-9]+','','g')))) order by a.confidence desc limit 1;end if;
  if v_product.id is null and v_name is not null then select p.* into v_product from public.products p where p.tenant_id=v_profile.tenant_id and p.model is not null and lower(regexp_replace(substring(v_name from '(?i)(PRO[[:space:]]*[0-9]+([[:space:]]*PLUS)?)'),'[^a-zA-Z0-9]+','','g'))=lower(regexp_replace(p.model,'[^a-zA-Z0-9]+','','g')) limit 1;end if;
  insert into public.sales_volume_records(tenant_id,import_batch,period_start,period_end,product_id,sku,product_name,model,brand,manufacturer_name,lot_number,units_sold,customers_count,revenue,source_file,source_row,created_by,imported_at) values(v_profile.tenant_id,v_batch,v_period_start,coalesce(v_period_end,v_period_start),v_product.id,coalesce(v_sku,v_product.code_sku,''),coalesce(v_name,v_product.name,'Produto não identificado'),coalesce(v_model,v_product.model),v_product.brand,v_product.manufacturer_name,nullif(v_row->>'lotNumber',''),v_units,greatest(v_customers,0),v_revenue,p_source_file,v_rownum,v_profile.id,now());
  v_inserted:=v_inserted+1;if v_product.id is null then v_unmatched:=v_unmatched+1;end if;
 end loop;
 insert into public.audit_logs(tenant_id,user_id,user_email,action,entity,details) values(v_profile.tenant_id,v_profile.id,v_profile.email,'SALES_VOLUME_IMPORTED','SALES_VOLUME',jsonb_build_object('batch',v_batch,'source_file',p_source_file,'rows',v_inserted,'unmatched',v_unmatched));
 return jsonb_build_object('batchId',v_batch,'inserted',v_inserted,'unmatched',v_unmatched);
end $$;
revoke all on function public.import_sales_volume_batch(jsonb,text) from public,anon;
grant execute on function public.import_sales_volume_batch(jsonb,text) to authenticated;

with candidate as (
 select ti.id item_id,p.id product_id,row_number() over(partition by ti.id order by length(regexp_replace(p.model,'[^a-zA-Z0-9]+','','g')) desc) rn
 from public.ticket_items ti join public.tickets t on t.id=ti.ticket_id join public.products p on p.tenant_id=t.tenant_id and ti.product_id is null and p.model is not null
 where lower(regexp_replace(substring(coalesce(ti.product_name,'') from '(?i)(PRO[[:space:]]*[0-9]+([[:space:]]*PLUS)?)'),'[^a-zA-Z0-9]+','','g'))=lower(regexp_replace(p.model,'[^a-zA-Z0-9]+','','g'))
),chosen as(select * from candidate where rn=1)
update public.ticket_items ti set product_id=c.product_id,product_model=coalesce(nullif(ti.product_model,''),p.model),anvisa_register=coalesce(nullif(ti.anvisa_register,''),p.anvisa_register),manufacturer_name=coalesce(nullif(ti.manufacturer_name,''),p.manufacturer_name),importer_name=coalesce(nullif(ti.importer_name,''),p.importer_name),distributor_name=coalesce(nullif(ti.distributor_name,''),p.distributor_name) from chosen c join public.products p on p.id=c.product_id where ti.id=c.item_id;

insert into public.product_aliases(tenant_id,canonical_product_id,alias_name,alias_sku,alias_model,source,confidence)
select distinct t.tenant_id,ti.product_id,nullif(ti.product_name,''),nullif(ti.sku,''),nullif(ti.product_model,''),'HISTORICAL_SAC',100 from public.ticket_items ti join public.tickets t on t.id=ti.ticket_id where ti.product_id is not null and not exists(select 1 from public.product_aliases a where a.tenant_id=t.tenant_id and a.canonical_product_id=ti.product_id and coalesce(lower(a.alias_name),'')=coalesce(lower(ti.product_name),'') and coalesce(lower(a.alias_sku),'')=coalesce(lower(ti.sku),''));
