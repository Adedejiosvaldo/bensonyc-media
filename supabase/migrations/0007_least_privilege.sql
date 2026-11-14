-- Least privilege: roles stay Member / Head / Admin, and an admin switches on extra permissions per person:
--   post   = post to Instagram and TikTok, refresh insights
--   plan   = build and edit the weekly content board, use the AI ideas
--   roster = generate, publish and assign the whole roster
-- Admins can do everything. A head manages their own department (its duties and board items).
-- Phone numbers and emails are no longer readable by every member: only the server reads them,
-- after checking the person is allowed. Safe to run more than once. Run after 0006.

begin;

-- ───────────── Permissions ─────────────
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'members' and column_name = 'grants') then
    alter table public.members add column grants text[] not null default '{}';
    -- Keep today's behaviour on day one: people who could do these things before keep them; admins then trim.
    update public.members set grants = array['post'] where status <> 'inactive' and role <> 'admin' and department_id = 'social';
    update public.members set grants = array['post', 'plan', 'roster'] where status <> 'inactive' and role = 'head';
  end if;
end $$;
alter table public.members drop constraint if exists members_grants_check;
alter table public.members add constraint members_grants_check check (grants <@ array['post', 'plan', 'roster']::text[]);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid() and role = 'admin' and status <> 'inactive')
$$;

create or replace function public.has_grant(g text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
     where user_id = auth.uid() and status <> 'inactive' and (role = 'admin' or g = any(grants))
  )
$$;

-- The department this person heads, if any.
create or replace function public.my_head_dept() returns text
language sql stable security definer set search_path = public as $$
  select department_id from public.members where user_id = auth.uid() and role = 'head' and status <> 'inactive'
$$;

-- Kept for anything still calling it: "can run the roster".
create or replace function public.is_lead() returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_grant('roster')
$$;

create or replace function public.can_post_social() returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_grant('post')
$$;

-- Only admins can change someone's role, status, account link or permissions (the guard already covers the rest).
create or replace function public.guard_member_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if old.user_id is null and new.user_id = auth.uid() and new.role = old.role and new.status = old.status and new.grants = old.grants then
    return new;
  end if;
  if new.role <> old.role or new.status <> old.status or new.user_id is distinct from old.user_id or new.grants <> old.grants then
    raise exception 'Only an admin can change role, status, permissions or account link';
  end if;
  return new;
end $$;

-- ───────────── Content board ─────────────
-- Read: everyone. Create and delete: "plan" permission, or the head of that item's department.
-- Update: the same, plus the item's owner, plus anyone claiming an item nobody owns yet.
drop policy if exists "content update" on public.content_items;
drop policy if exists "content lead insert" on public.content_items;
drop policy if exists "content lead delete" on public.content_items;
create policy "content update" on public.content_items for update to authenticated
  using (public.has_grant('plan') or department_id = public.my_head_dept() or owner_id = public.my_member_id() or owner_id is null)
  with check (public.has_grant('plan') or department_id = public.my_head_dept() or owner_id = public.my_member_id());
create policy "content plan insert" on public.content_items for insert to authenticated
  with check (public.has_grant('plan') or department_id = public.my_head_dept());
create policy "content plan delete" on public.content_items for delete to authenticated
  using (public.has_grant('plan') or department_id = public.my_head_dept());

-- ───────────── Roster ─────────────
-- Weeks (generate, publish): "roster" permission. Slots: "roster", or the head of that slot's department.
drop policy if exists "weeks lead" on public.roster_weeks;
create policy "weeks roster" on public.roster_weeks for all to authenticated using (public.has_grant('roster')) with check (public.has_grant('roster'));
drop policy if exists "slots lead" on public.roster_slots;
create policy "slots roster" on public.roster_slots for all to authenticated
  using (public.has_grant('roster') or department_id = public.my_head_dept())
  with check (public.has_grant('roster') or department_id = public.my_head_dept());

-- Blocked dates: your own, or anyone's with the roster permission.
drop policy if exists "blockouts own insert" on public.blockouts;
drop policy if exists "blockouts own delete" on public.blockouts;
create policy "blockouts own insert" on public.blockouts for insert to authenticated
  with check (member_id = public.my_member_id() or public.has_grant('roster'));
create policy "blockouts own delete" on public.blockouts for delete to authenticated
  using (member_id = public.my_member_id() or public.has_grant('roster'));

-- Cancelling a swap: the person who asked, the roster permission, or the head of that department.
create or replace function public.cancel_swap(p_swap uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.swap_requests r
     set status = 'cancelled', resolved_at = now()
    from public.roster_slots s
   where r.id = p_swap and r.status = 'open' and s.id = r.slot_id
     and (r.from_member = public.my_member_id() or public.has_grant('roster') or s.department_id = public.my_head_dept());
end $$;

-- ───────────── AI ideas ─────────────
drop policy if exists "ai runs readable" on public.ai_runs;
create policy "ai runs readable" on public.ai_runs for select to authenticated using (public.has_grant('plan'));
drop policy if exists "ai suggestions readable" on public.ai_suggestions;
create policy "ai suggestions readable" on public.ai_suggestions for select to authenticated using (public.has_grant('plan'));
drop policy if exists "ai peers readable" on public.ai_peer_accounts;
create policy "ai peers readable" on public.ai_peer_accounts for select to authenticated using (public.has_grant('plan'));

-- ───────────── Contact details ─────────────
-- Signed-in users can read every member column except phone and email. The server reads those with the
-- service key, after checking the viewer may see them. If you add a column to members later, grant it here.
revoke select on public.members from anon, authenticated;
grant select (id, user_id, full_name, department_id, role, status, break_until, created_at, grants) on public.members to authenticated;

commit;

notify pgrst, 'reload schema';
