alter function public.apply_ticket_sla() set search_path=public;
alter function public.apply_lot_action_status() set search_path=public;

revoke all on function public.fill_ticket_item_product_snapshot() from public, anon, authenticated;
revoke all on function public.log_ticket_action_event() from public, anon, authenticated;
revoke all on function public.log_ticket_attachment_event() from public, anon, authenticated;
revoke all on function public.log_ticket_cost_event() from public, anon, authenticated;

revoke all on function public.register_ticket_evolution(uuid,text,text,text,text,timestamptz,text,text,boolean) from public, anon;
grant execute on function public.register_ticket_evolution(uuid,text,text,text,text,timestamptz,text,text,boolean) to authenticated;
revoke all on function public.complete_ticket_action(uuid,text) from public, anon;
grant execute on function public.complete_ticket_action(uuid,text) to authenticated;

revoke all on table public.products from anon;
revoke insert, update, delete, truncate, references, trigger on table public.products from authenticated;
grant select on table public.products to authenticated;

drop policy if exists products_tenant_access on public.products;
drop policy if exists products_tenant_read on public.products;
create policy products_tenant_read on public.products
for select to authenticated
using (tenant_id = public.user_tenant_id());

revoke all on function public.create_product_master(jsonb) from public, anon;
revoke all on function public.update_product_master(uuid,jsonb) from public, anon;
revoke all on function public.set_product_master_active(uuid,boolean) from public, anon;
grant execute on function public.create_product_master(jsonb) to authenticated;
grant execute on function public.update_product_master(uuid,jsonb) to authenticated;
grant execute on function public.set_product_master_active(uuid,boolean) to authenticated;
