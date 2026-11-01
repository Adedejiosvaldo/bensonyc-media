-- Benson YC Media Unit — schema, security and helpers
-- Run in Supabase → SQL Editor (or `supabase db push`).

create extension if not exists "pgcrypto";

-- ───────────── Departments ─────────────
create table public.departments (
  id text primary key,                       -- 'projection' | 'photography' | 'content' | 'design' | 'social'
  name text not null,
  short text not null,
  sort int not null default 0
);

-- ───────────── Members ─────────────
create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  email text unique,
  phone text,
  department_id text references public.departments(id),
  role text not null default 'member' check (role in ('member','head','admin')),
  status text not null default 'active' check (status in ('active','on_break','inactive')),
  break_until date,
  created_at timestamptz not null default now()
);
create index on public.members (department_id);

-- ───────────── Rules pledge ─────────────
create table public.pledges (
  member_id uuid primary key references public.members(id) on delete cascade,
  signature text not null,
  rules_version int not null default 1,
  agreed_at timestamptz not null default now()
);

-- ───────────── Onboarding progress ─────────────
create table public.lesson_progress (
  member_id uuid references public.members(id) on delete cascade,
  lesson_slug text not null,
  completed_at timestamptz not null default now(),
  primary key (member_id, lesson_slug)
);

-- ───────────── 9-month master plan ─────────────
create table public.plan_months (
  id uuid primary key default gen_random_uuid(),
  month date not null unique,                -- first day of the month
  theme text not null,
  big_moment text not null,
  hero_content text not null,
  highlight text,
  follower_target int not null,
  followers_actual int,
  notes text
);

-- ───────────── Weekly content (snippets of the master plan) ─────────────
create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,                  -- the Sunday the week starts on
  day date not null,
  series text not null,
  pillar text not null check (pillar in ('People','Word','Events','Community')),
  format text not null,
  title text not null,
  brief text not null,
  department_id text references public.departments(id),
  owner_id uuid references public.members(id) on delete set null,
  status text not null default 'planned' check (status in ('planned','shot','edited','posted','skipped')),
  link text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.content_items (week_start);

-- ───────────── Rosters ─────────────
create table public.roster_weeks (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,           -- Sunday
  notes text,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.roster_slots (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.roster_weeks(id) on delete cascade,
  service_date date not null,
  service_label text not null,
  department_id text not null references public.departments(id),
  duty text not null,
  member_id uuid references public.members(id) on delete set null,
  sort int not null default 0
);
create index on public.roster_slots (week_id);
create index on public.roster_slots (member_id, service_date);

-- ───────────── Helper functions ─────────────
create or replace function public.my_member_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.members where user_id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid() and role = 'admin')
$$;

create or replace function public.is_lead() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid() and role in ('admin','head'))
$$;

-- Registration: claim a pre-listed name (e.g. "David" in Projection) or create a new member.
create or replace function public.join_unit(p_full_name text, p_phone text, p_department text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_email text := (select email from auth.users where id = auth.uid());
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;

  select id into v_id from public.members where user_id = auth.uid();
  if v_id is not null then
    update public.members set full_name = p_full_name, phone = p_phone, department_id = p_department where id = v_id;
    return v_id;
  end if;

  select id into v_id from public.members
   where user_id is null
     and department_id = p_department
     and lower(split_part(full_name, ' ', 1)) = lower(split_part(trim(p_full_name), ' ', 1))
   limit 1;

  if v_id is not null then
    update public.members
       set user_id = auth.uid(), email = v_email, phone = p_phone, full_name = trim(p_full_name)
     where id = v_id;
  else
    insert into public.members (user_id, full_name, email, phone, department_id)
    values (auth.uid(), trim(p_full_name), v_email, p_phone, p_department)
    returning id into v_id;
  end if;
  return v_id;
end $$;

-- Members cannot promote themselves or change their own status.
create or replace function public.guard_member_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  -- claiming an unlinked, pre-listed row during registration is allowed
  if old.user_id is null and new.user_id = auth.uid() and new.role = old.role and new.status = old.status then
    return new;
  end if;
  if new.role <> old.role or new.status <> old.status or new.user_id is distinct from old.user_id then
    raise exception 'Only an admin can change role, status or account link';
  end if;
  return new;
end $$;
create trigger members_guard before update on public.members
for each row execute function public.guard_member_update();

-- ───────────── Row level security ─────────────
alter table public.departments enable row level security;
alter table public.members enable row level security;
alter table public.pledges enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.plan_months enable row level security;
alter table public.content_items enable row level security;
alter table public.roster_weeks enable row level security;
alter table public.roster_slots enable row level security;

-- Public reads (landing page + 9-month plan)
create policy "departments readable" on public.departments for select using (true);
create policy "plan readable" on public.plan_months for select using (true);
create policy "departments admin" on public.departments for all using (public.is_admin()) with check (public.is_admin());
create policy "plan admin" on public.plan_months for all using (public.is_admin()) with check (public.is_admin());

-- Members: everyone signed in can see the team (so progress is trackable by all)
create policy "members readable" on public.members for select to authenticated using (true);
create policy "members update self" on public.members for update to authenticated
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "members admin insert" on public.members for insert to authenticated with check (public.is_admin());
create policy "members admin delete" on public.members for delete to authenticated using (public.is_admin());

-- Pledges & progress: readable by the team, written by yourself
create policy "pledges readable" on public.pledges for select to authenticated using (true);
create policy "pledges own" on public.pledges for insert to authenticated with check (member_id = public.my_member_id());
create policy "pledges own update" on public.pledges for update to authenticated using (member_id = public.my_member_id());

create policy "progress readable" on public.lesson_progress for select to authenticated using (true);
create policy "progress own insert" on public.lesson_progress for insert to authenticated with check (member_id = public.my_member_id());
create policy "progress own delete" on public.lesson_progress for delete to authenticated using (member_id = public.my_member_id());

-- Content: everyone reads and can move status/owner; leads create and delete
create policy "content readable" on public.content_items for select to authenticated using (true);
create policy "content update" on public.content_items for update to authenticated using (public.my_member_id() is not null);
create policy "content lead insert" on public.content_items for insert to authenticated with check (public.is_lead());
create policy "content lead delete" on public.content_items for delete to authenticated using (public.is_lead());

-- Rosters: everyone reads; heads and admins write
create policy "weeks readable" on public.roster_weeks for select to authenticated using (true);
create policy "weeks lead" on public.roster_weeks for all to authenticated using (public.is_lead()) with check (public.is_lead());
create policy "slots readable" on public.roster_slots for select to authenticated using (true);
create policy "slots lead" on public.roster_slots for all to authenticated using (public.is_lead()) with check (public.is_lead());
