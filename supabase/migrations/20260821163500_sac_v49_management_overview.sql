create or replace view public.sac_management_overview with (security_invoker=true) as
select t.tenant_id,t.id ticket_id,t.protocol,t.status,t.priority,t.category,cu.name customer_name,p.full_name assigned_to_name,t.assigned_area,t.created_at,t.sla_due_at,
coalesce(a.open_actions,0) open_actions,coalesce(a.overdue_actions,0) overdue_actions,a.next_due_at,
coalesce(c.gross_cost,0) gross_cost,coalesce(c.recovered_amount,0) recovered_amount,coalesce(c.net_cost,0) net_cost,coalesce(c.cost_entries,0) cost_entries
from public.tickets t join public.customers cu on cu.id=t.customer_id left join public.profiles p on p.id=t.assigned_to left join public.sac_action_summary a on a.ticket_id=t.id and a.tenant_id=t.tenant_id left join public.sac_cost_summary c on c.ticket_id=t.id and c.tenant_id=t.tenant_id;
create index if not exists idx_tickets_management on public.tickets(tenant_id,status,priority,sla_due_at);