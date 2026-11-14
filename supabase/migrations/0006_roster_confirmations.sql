-- Roster confirmations: a lead publishes the roster, everyone on it accepts or declines (with a reason),
-- and a decline opens a swap so the department can cover it. Safe to run more than once.
-- Run in Supabase → SQL Editor after 0005.

begin;

-- ───────────── Publishing ─────────────
-- A roster is a draft until published. Rosters that existed before this migration count as published,
-- so nobody loses sight of them; that back-fill runs only the first time, when the column is created.
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'roster_weeks' and column_name = 'published_at') then
    alter table public.roster_weeks add column published_at timestamptz;
    update public.roster_weeks set published_at = created_at;
  end if;
end $$;
alter table public.roster_weeks add column if not exists published_by uuid references public.members(id) on delete set null;
-- Replies are due by this time (Thursday 8pm Lagos before the Sunday). Null means no deadline.
alter table public.roster_weeks add column if not exists deadline timestamptz;

-- ───────────── Replies ─────────────
alter table public.roster_slots add column if not exists response text not null default 'pending';
alter table public.roster_slots drop constraint if exists roster_slots_response_check;
alter table public.roster_slots add constraint roster_slots_response_check check (response in ('pending','accepted','declined'));
alter table public.roster_slots add column if not exists responded_at timestamptz;
alter table public.roster_slots add column if not exists decline_reason text;
-- When this person was emailed about this duty; cleared when the duty moves to someone else.
alter table public.roster_slots add column if not exists notified_at timestamptz;

-- Moving a duty to someone else starts their reply afresh, unless the change itself sets a reply
-- (taking a swap counts as accepting).
create or replace function public.reset_duty_reply() returns trigger
language plpgsql as $$
begin
  if new.member_id is distinct from old.member_id and new.response is not distinct from old.response then
    new.response := 'pending';
    new.responded_at := null;
    new.decline_reason := null;
    new.notified_at := null;
  end if;
  return new;
end $$;
drop trigger if exists roster_slots_reset_reply on public.roster_slots;
create trigger roster_slots_reset_reply before update on public.roster_slots
for each row execute function public.reset_duty_reply();

-- Taking a swap now also marks the duty accepted by the person who took it.
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

  update public.roster_slots
     set member_id = v_me, response = 'accepted', responded_at = now(), decline_reason = null, notified_at = now()
   where id = v_slot.id;
  update public.swap_requests set status = 'taken', to_member = v_me, resolved_at = now() where id = p_swap;
end $$;

-- The person on a duty accepts or declines it. Declining opens a swap request (the reason is its note)
-- so the department sees it needs cover; accepting again closes that request if nobody has taken it yet.
create or replace function public.respond_to_duty(p_slot uuid, p_response text, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.my_member_id();
  v_slot public.roster_slots;
  v_published timestamptz;
begin
  if v_me is null then raise exception 'Sign in first'; end if;
  if p_response not in ('accepted', 'declined') then raise exception 'Choose accept or decline'; end if;
  select * into v_slot from public.roster_slots where id = p_slot for update;
  if v_slot.id is null or v_slot.member_id is distinct from v_me then raise exception 'This duty isn’t yours'; end if;
  if v_slot.service_date < (now() at time zone 'Africa/Lagos')::date then raise exception 'This service has already happened'; end if;
  select published_at into v_published from public.roster_weeks where id = v_slot.week_id;
  if v_published is null then raise exception 'This roster isn’t published yet'; end if;
  if p_response = 'declined' and coalesce(trim(p_reason), '') = '' then raise exception 'Add a short reason so your head can plan'; end if;

  update public.roster_slots
     set response = p_response,
         responded_at = now(),
         decline_reason = case when p_response = 'declined' then left(trim(p_reason), 200) else null end
   where id = p_slot;

  if p_response = 'declined' then
    if not exists (select 1 from public.swap_requests where slot_id = p_slot and status = 'open') then
      insert into public.swap_requests (slot_id, from_member, note) values (p_slot, v_me, left(trim(p_reason), 200));
    end if;
  else
    update public.swap_requests set status = 'cancelled', resolved_at = now()
     where slot_id = p_slot and status = 'open' and from_member = v_me;
  end if;
end $$;

commit;

notify pgrst, 'reload schema';
