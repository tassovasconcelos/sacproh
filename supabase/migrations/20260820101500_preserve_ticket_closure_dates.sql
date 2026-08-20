create or replace function public.preserve_ticket_closure_dates()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.status in ('CLOSED_PROCEDENT','CLOSED_NON_PROCEDENT','CANCELLED')
     and new.status = old.status
     and old.closed_at is not null then
    new.closed_at := old.closed_at;
    if old.resolved_at is not null then
      new.resolved_at := old.resolved_at;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.preserve_ticket_closure_dates() from public, anon, authenticated;

drop trigger if exists trg_preserve_ticket_closure_dates on public.tickets;
create trigger trg_preserve_ticket_closure_dates
before update of status, closed_at, resolved_at on public.tickets
for each row execute function public.preserve_ticket_closure_dates();
