-- SACPROH V4.4 - dossiê, anexos por etapa, histórico e snapshots de produto
alter table public.ticket_items add column if not exists product_description text;
alter table public.ticket_attachments add column if not exists qualification_stage text;
alter table public.ticket_attachments add column if not exists description text;
alter table public.ticket_attachments add column if not exists uploaded_by_name text;

update public.ticket_items ti
set product_description = coalesce(ti.product_description, p.description),
    product_model = coalesce(ti.product_model, p.model),
    anvisa_register = coalesce(ti.anvisa_register, p.anvisa_register),
    manufacturer_name = coalesce(ti.manufacturer_name, p.manufacturer_name),
    importer_name = coalesce(ti.importer_name, p.importer_name),
    distributor_name = coalesce(ti.distributor_name, p.distributor_name)
from public.products p
where p.id = ti.product_id;

create index if not exists idx_ticket_attachments_ticket_created on public.ticket_attachments(ticket_id, created_at desc);
create index if not exists idx_ticket_events_ticket_occurred on public.ticket_events(ticket_id, occurred_at desc);

create or replace function public.fill_ticket_item_product_snapshot()
returns trigger language plpgsql security definer set search_path = public as $$
declare p public.products%rowtype;
begin
  if new.product_id is not null then
    select * into p from public.products where id = new.product_id;
    if found then
      new.product_name := coalesce(nullif(new.product_name,''), p.name);
      new.product_model := coalesce(nullif(new.product_model,''), p.model);
      new.product_description := coalesce(nullif(new.product_description,''), p.description);
      new.sku := coalesce(nullif(new.sku,''), p.code_sku);
      new.anvisa_register := coalesce(nullif(new.anvisa_register,''), p.anvisa_register);
      new.manufacturer_name := coalesce(nullif(new.manufacturer_name,''), p.manufacturer_name);
      new.importer_name := coalesce(nullif(new.importer_name,''), p.importer_name);
      new.distributor_name := coalesce(nullif(new.distributor_name,''), p.distributor_name);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_fill_ticket_item_product_snapshot on public.ticket_items;
create trigger trg_fill_ticket_item_product_snapshot before insert or update of product_id on public.ticket_items for each row execute function public.fill_ticket_item_product_snapshot();

create or replace function public.log_ticket_attachment_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.ticket_events(tenant_id,ticket_id,event_type,title,description,actor_id,actor_name,source_type,source_id,metadata,occurred_at)
  values(new.tenant_id,new.ticket_id,'ATTACHMENT_ADDED','Arquivo anexado ao protocolo',coalesce(new.description,new.file_name),new.uploaded_by,new.uploaded_by_name,'ATTACHMENT',new.id,
    jsonb_build_object('file_name',new.file_name,'file_type',new.file_type,'file_size',new.file_size,'document_type',new.document_type,'qualification_stage',new.qualification_stage),new.created_at);
  return new;
end $$;

drop trigger if exists trg_ticket_attachment_event on public.ticket_attachments;
create trigger trg_ticket_attachment_event after insert on public.ticket_attachments for each row execute function public.log_ticket_attachment_event();

create or replace view public.sac_protocol_report as
select
  t.id as ticket_id, t.tenant_id, t.protocol, t.created_at, t.updated_at, t.status,
  t.category, t.subcategory, t.priority, t.qualification_stage, t.qualification_notes,
  t.description as occurrence_description, t.invoice_number, t.seller_name,
  c.name as customer_name, c.document as customer_document, c.email as customer_email,
  ti.id as ticket_item_id, ti.product_name, ti.product_description, ti.product_model,
  ti.sku, ti.quantity, ti.lot_number, ti.serial_number, ti.anvisa_register,
  ti.manufacturer_name, ti.importer_name, ti.distributor_name,
  (select count(*) from public.ticket_attachments ta where ta.ticket_id=t.id) as attachment_count,
  (select count(*) from public.ticket_events te where te.ticket_id=t.id) as event_count
from public.tickets t
left join public.customers c on c.id=t.customer_id
left join public.ticket_items ti on ti.ticket_id=t.id;

alter view public.sac_protocol_report set (security_invoker = true);
