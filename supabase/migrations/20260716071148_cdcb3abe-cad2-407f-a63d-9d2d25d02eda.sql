
create type public.ticket_category as enum ('engine','hydraulics','electrical','transmission','body','implement','other');
create type public.ticket_priority as enum ('low','medium','high','critical');
create type public.ticket_status as enum ('open','triaged','assigned','in_progress','resolved','closed');

create sequence if not exists public.ticket_number_seq;

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_no text not null unique default ('EK-' || lpad(nextval('public.ticket_number_seq')::text, 6, '0')),
  customer_id uuid not null references auth.users(id) on delete cascade,
  dealer_id uuid references auth.users(id) on delete set null,
  engineer_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text not null,
  category public.ticket_category not null default 'other',
  priority public.ticket_priority not null default 'medium',
  status public.ticket_status not null default 'open',
  model text,
  serial_no text,
  location text,
  ai_summary text,
  ai_priority public.ticket_priority,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.tickets to authenticated;
grant all on public.tickets to service_role;

alter table public.tickets enable row level security;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id,'admin')
      or public.has_role(_user_id,'dealer')
      or public.has_role(_user_id,'service_engineer');
$$;

create policy "Tickets: owner or staff read" on public.tickets
  for select to authenticated using (
    customer_id = auth.uid()
    or dealer_id = auth.uid()
    or engineer_id = auth.uid()
    or public.is_staff(auth.uid())
  );

create policy "Tickets: customer create own" on public.tickets
  for insert to authenticated with check (customer_id = auth.uid());

create policy "Tickets: owner or staff update" on public.tickets
  for update to authenticated using (
    customer_id = auth.uid() or public.is_staff(auth.uid())
  ) with check (
    customer_id = auth.uid() or public.is_staff(auth.uid())
  );

create policy "Tickets: admin delete" on public.tickets
  for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create trigger tickets_updated_at before update on public.tickets
  for each row execute function public.set_updated_at();

create index tickets_customer_idx on public.tickets(customer_id);
create index tickets_engineer_idx on public.tickets(engineer_id);
create index tickets_status_idx on public.tickets(status);

-- Ticket messages
create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

grant select, insert on public.ticket_messages to authenticated;
grant all on public.ticket_messages to service_role;

alter table public.ticket_messages enable row level security;

create or replace function public.can_access_ticket(_ticket_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tickets t
    where t.id = _ticket_id
      and (t.customer_id = _user_id
           or t.dealer_id = _user_id
           or t.engineer_id = _user_id
           or public.is_staff(_user_id))
  );
$$;

create policy "Messages: participants read" on public.ticket_messages
  for select to authenticated using (
    public.can_access_ticket(ticket_id, auth.uid())
    and (not is_internal or public.is_staff(auth.uid()))
  );

create policy "Messages: participants send" on public.ticket_messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and public.can_access_ticket(ticket_id, auth.uid())
    and (not is_internal or public.is_staff(auth.uid()))
  );

create index ticket_messages_ticket_idx on public.ticket_messages(ticket_id, created_at);
