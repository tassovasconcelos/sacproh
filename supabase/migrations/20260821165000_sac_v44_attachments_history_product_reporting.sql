alter table public.ticket_attachments add column if not exists qualification_stage text;
alter table public.ticket_attachments add column if not exists description text;
alter table public.ticket_attachments add column if not exists uploaded_by_name text;
alter table public.ticket_items add column if not exists product_description text;

create index if not exists idx_ticket_attachments_ticket_created on public.ticket_attachments(ticket_id, created_at desc);
create index if not exists idx_ticket_events_ticket_occurred on public.ticket_events(ticket_id, occurred_at desc);

update public.ticket_items ti
set product_model = coalesce(ti.product_model,p.model),
    product_description = coalesce(ti.product_description,p.description),
    anvisa_register = coalesce(ti.anvisa_register,p.anvisa_register),
    manufacturer_name = coalesce(ti.manufacturer_name,p.manufacturer_name),
    importer_name = coalesce(ti.importer_name,p.importer_name),
    distributor_name = coalesce(ti.distributor_name,p.distributor_name)
from public.products p where ti.product_id=p.id;

create or replace function public.log_ticket_attachment_event() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.ticket_events(tenant_id,ticket_id,event_type,title,description,actor_id,actor_name,source_type,source_id,metadata,occurred_at)
 values(new.tenant_id,new.ticket_id,'ATTACHMENT_ADDED','Arquivo anexado ao protocolo',coalesce(new.description,new.file_name),new.uploaded_by,new.uploaded_by_name,'ATTACHMENT',new.id,jsonb_build_object('file_name',new.file_name,'file_type',new.file_type,'file_size',new.file_size,'document_type',new.document_type,'qualification_stage',new.qualification_stage),new.created_at);
 return new;
end $$;
drop trigger if exists trg_ticket_attachment_event on public.ticket_attachments;
create trigger trg_ticket_attachment_event after insert on public.ticket_attachments for each row execute function public.log_ticket_attachment_event();

create or replace view public.sac_protocol_report as
select t.tenant_id,t.id ticket_id,t.protocol,t.created_at,t.updated_at,t.status,t.priority,t.category,t.subcategory,t.description occurrence_description,t.qualification_stage,t.qualification_notes,t.invoice_number,t.assigned_area,t.resolved_at,t.closed_at,t.final_opinion,t.final_procedency,c.name customer_name,c.document customer_document,c.trade_name customer_trade_name,ti.id item_id,ti.product_id,ti.product_name,ti.product_description,ti.product_model,ti.sku,ti.quantity,ti.serial_number,ti.lot_number,ti.manufacturing_date,ti.expiration_date,ti.anvisa_register,ti.manufacturer_name,ti.importer_name,ti.distributor_name,(select count(*) from public.ticket_attachments a where a.ticket_id=t.id) attachments_count,(select count(*) from public.ticket_events e where e.ticket_id=t.id) events_count
from public.tickets t left join public.customers c on c.id=t.customer_id left join public.ticket_items ti on ti.ticket_id=t.id;