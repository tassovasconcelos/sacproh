-- SACPROH V4.6 - evolução cronológica do protocolo e custos do processo
alter table public.ticket_costs add column if not exists cost_center text;
alter table public.ticket_costs add column if not exists responsible_area text;
alter table public.ticket_costs add column if not exists document_reference text;
alter table public.ticket_costs add column if not exists quantity numeric(14,4) not null default 1;
alter table public.ticket_costs add column if not exists unit_amount numeric(14,2);
alter table public.ticket_costs add column if not exists approval_status text not null default 'REGISTERED';
alter table public.ticket_costs add column if not exists reimbursable boolean not null default false;
alter table public.ticket_costs add column if not exists recovered_amount numeric(14,2) not null default 0;

create index if not exists idx_ticket_costs_ticket_occurred on public.ticket_costs(ticket_id, occurred_at desc, created_at desc);
create index if not exists idx_ticket_costs_tenant_type on public.ticket_costs(tenant_id, cost_type);

create or replace function public.register_ticket_evolution(
  p_ticket_id uuid,
  p_title text,
  p_description text,
  p_stage text default null,
  p_next_action text default null,
  p_due_at timestamptz default null,
  p_contact_channel text default null,
  p_external_party text default null,
  p_internal boolean default false
) returns uuid
language plpgsql security definer set search_path=public as $$
declare
  v_profile public.profiles%rowtype;
  v_ticket public.tickets%rowtype;
  v_event_id uuid;
begin
  select * into v_profile from public.profiles where id=auth.uid() and is_active=true;
  if not found then raise exception 'Usuário não autorizado'; end if;
  select * into v_ticket from public.tickets where id=p_ticket_id and tenant_id=v_profile.tenant_id;
  if not found then raise exception 'Protocolo não encontrado para esta empresa'; end if;
  if nullif(trim(p_title),'') is null or nullif(trim(p_description),'') is null then raise exception 'Título e descrição da evolução são obrigatórios'; end if;

  insert into public.ticket_events(tenant_id,ticket_id,event_type,title,description,actor_id,actor_name,source_type,metadata,occurred_at)
  values(v_ticket.tenant_id,v_ticket.id,'PROTOCOL_EVOLUTION',trim(p_title),trim(p_description),v_profile.id,v_profile.full_name,'EVOLUTION',
    jsonb_build_object('qualification_stage',p_stage,'next_action',p_next_action,'due_at',p_due_at,'contact_channel',p_contact_channel,'external_party',p_external_party,'internal',p_internal),now())
  returning id into v_event_id;

  if p_stage is not null and p_stage in ('REGISTRATION','DOCUMENT_VALIDATION','TECHNICAL_TRIAGE','INVESTIGATION','ACTION_PLAN','SOLUTION_VALIDATION','COMPLETED') then
    update public.tickets set qualification_stage=p_stage, qualification_notes=trim(p_description), qualification_updated_at=now(), updated_at=now() where id=v_ticket.id;
  else
    update public.tickets set updated_at=now() where id=v_ticket.id;
  end if;
  return v_event_id;
end $$;

grant execute on function public.register_ticket_evolution(uuid,text,text,text,text,timestamptz,text,text,boolean) to authenticated;

create or replace function public.log_ticket_cost_event() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' then
    insert into public.ticket_events(tenant_id,ticket_id,event_type,title,description,actor_id,actor_name,source_type,source_id,metadata,occurred_at)
    values(new.tenant_id,new.ticket_id,'COST_ADDED','Custo registrado no protocolo',new.description,new.created_by,new.created_by_name,'COST',new.id,
      jsonb_build_object('cost_type',new.cost_type,'amount',new.amount,'invoice_number',new.invoice_number,'supplier_name',new.supplier_name,'cost_center',new.cost_center,'responsible_area',new.responsible_area,'document_reference',new.document_reference,'quantity',new.quantity,'unit_amount',new.unit_amount,'approval_status',new.approval_status,'reimbursable',new.reimbursable,'recovered_amount',new.recovered_amount),now());
  elsif tg_op='UPDATE' then
    insert into public.ticket_events(tenant_id,ticket_id,event_type,title,description,actor_id,actor_name,source_type,source_id,metadata,occurred_at)
    values(new.tenant_id,new.ticket_id,'COST_UPDATED','Custo atualizado no protocolo',new.description,new.created_by,new.created_by_name,'COST',new.id,
      jsonb_build_object('before',to_jsonb(old),'after',to_jsonb(new)),now());
  end if;
  return new;
end $$;

drop trigger if exists trg_ticket_cost_event on public.ticket_costs;
create trigger trg_ticket_cost_event after insert or update on public.ticket_costs for each row execute function public.log_ticket_cost_event();

create or replace view public.sac_cost_summary as
select t.tenant_id,t.id as ticket_id,t.protocol,t.status,t.category,t.priority,t.created_at,t.closed_at,
       coalesce(sum(c.amount),0)::numeric(14,2) as gross_cost,
       coalesce(sum(c.recovered_amount),0)::numeric(14,2) as recovered_amount,
       (coalesce(sum(c.amount),0)-coalesce(sum(c.recovered_amount),0))::numeric(14,2) as net_cost,
       count(c.id) as cost_entries
from public.tickets t left join public.ticket_costs c on c.ticket_id=t.id
group by t.tenant_id,t.id,t.protocol,t.status,t.category,t.priority,t.created_at,t.closed_at;