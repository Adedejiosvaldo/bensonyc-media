-- Availability (blockout dates), duty swaps and a private calendar feed.
-- Run after 0001_init.sql in Supabase → SQL Editor.

-- ───────────── Blockout dates ─────────────
-- A member marks days they can't serve. The roster generator skips them.
create table public.blockouts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index on public.blockouts (member_id);
create index on public.blockouts (end_date);

alter table public.blockouts enable row level security;
create policy "blockouts readable" on public.blockouts for select to authenticated using (true);
create policy "blockouts own insert" on public.blockouts for insert to authenticated
  with check (member_id = public.my_member_id() or public.is_lead());
create policy "blockouts own delete" on public.blockouts for delete to authenticated
  using (member_id = public.my_member_id() or public.is_lead());

-- ───────────── Duty swaps ─────────────
-- Someone on the roster asks for cover; anyone in the same department can take it.
-- No admin needed: the swap functions below move the slot safely.
create table public.swap_requests (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.roster_slots(id) on delete cascade,
  from_member uuid not null references public.members(id) on delete cascade,
  to_member uuid references public.members(id) on delete set null,
  note text,
  status text not null default 'open' check (status in ('open','taken','cancelled')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index on public.swap_requests (status);
create unique index swap_one_open_per_slot on public.swap_requests (slot_id) where status = 'open';

alter table public.swap_requests enable row level security;
create policy "swaps readable" on public.swap_requests for select to authenticated using (true);
-- writes go through the functions below

create or replace function public.request_swap(p_slot uuid, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.my_member_id();
  v_id uuid;
begin
  if v_me is null then raise exception 'Sign in first'; end if;
  if not exists (select 1 from public.roster_slots where id = p_slot and member_id = v_me) then
    raise exception 'You can only ask for cover on your own duty';
  end if;
  select id into v_id from public.swap_requests where slot_id = p_slot and status = 'open';
  if v_id is not null then return v_id; end if;
  insert into public.swap_requests (slot_id, from_member, note)
  values (p_slot, v_me, nullif(trim(p_note), ''))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.take_swap(p_swap uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.my_member_id();
  v_req public.swap_requests;
  v_slot public.roster_slots;
  v_dept text;
begin
  if v_me is null then raise exception 'Sign in first'; end if;
  select * into v_req from public.swap_requests where id = p_swap for update;
  if v_req.id is null or v_req.status <> 'open' then raise exception 'This swap is no longer open'; end if;
  if v_req.from_member = v_me then raise exception 'You cannot take your own swap'; end if;
  select * into v_slot from public.roster_slots where id = v_req.slot_id;
  select department_id into v_dept from public.members where id = v_me;
  if v_dept is distinct from v_slot.department_id then raise exception 'Only someone in the same department can take this duty'; end if;
  if v_slot.member_id is distinct from v_req.from_member then raise exception 'This duty has already been moved'; end if;

  update public.roster_slots set member_id = v_me where id = v_slot.id;
  update public.swap_requests set status = 'taken', to_member = v_me, resolved_at = now() where id = p_swap;
end $$;

create or replace function public.cancel_swap(p_swap uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.swap_requests
     set status = 'cancelled', resolved_at = now()
   where id = p_swap and status = 'open'
     and (from_member = public.my_member_id() or public.is_lead());
end $$;

-- ───────────── Private calendar feed ─────────────
-- Each member gets a secret token for /api/calendar/<token> (Google/Apple/Outlook subscribe).
-- Kept in its own table so teammates can't read each other's tokens.
create table public.calendar_tokens (
  member_id uuid primary key references public.members(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.calendar_tokens enable row level security;
create policy "token own read" on public.calendar_tokens for select to authenticated using (member_id = public.my_member_id());
create policy "token own insert" on public.calendar_tokens for insert to authenticated with check (member_id = public.my_member_id());
create policy "token own update" on public.calendar_tokens for update to authenticated
  using (member_id = public.my_member_id()) with check (member_id = public.my_member_id());
