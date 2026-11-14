-- Catch-up for a database that never ran migrations 0002, 0003 and 0004 (or ran only some of them).
-- Same objects as those three files, written so it is safe to run on any state: tables and indexes use
-- "if not exists", policies are dropped and recreated, functions are "create or replace".
-- Paste the whole file into Supabase → SQL Editor and run it once. It runs as one transaction.

begin;

-- ═════════════ 0002: availability, swaps, calendar feed ═════════════

create table if not exists public.blockouts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists blockouts_member_id_idx on public.blockouts (member_id);
create index if not exists blockouts_end_date_idx on public.blockouts (end_date);

alter table public.blockouts enable row level security;
drop policy if exists "blockouts readable" on public.blockouts;
create policy "blockouts readable" on public.blockouts for select to authenticated using (true);
drop policy if exists "blockouts own insert" on public.blockouts;
create policy "blockouts own insert" on public.blockouts for insert to authenticated
  with check (member_id = public.my_member_id() or public.is_lead());
drop policy if exists "blockouts own delete" on public.blockouts;
create policy "blockouts own delete" on public.blockouts for delete to authenticated
  using (member_id = public.my_member_id() or public.is_lead());

create table if not exists public.swap_requests (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.roster_slots(id) on delete cascade,
  from_member uuid not null references public.members(id) on delete cascade,
  to_member uuid references public.members(id) on delete set null,
  note text,
  status text not null default 'open' check (status in ('open','taken','cancelled')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists swap_requests_status_idx on public.swap_requests (status);
create unique index if not exists swap_one_open_per_slot on public.swap_requests (slot_id) where status = 'open';

alter table public.swap_requests enable row level security;
drop policy if exists "swaps readable" on public.swap_requests;
create policy "swaps readable" on public.swap_requests for select to authenticated using (true);

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

create table if not exists public.calendar_tokens (
  member_id uuid primary key references public.members(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.calendar_tokens enable row level security;
drop policy if exists "token own read" on public.calendar_tokens;
create policy "token own read" on public.calendar_tokens for select to authenticated using (member_id = public.my_member_id());
drop policy if exists "token own insert" on public.calendar_tokens;
create policy "token own insert" on public.calendar_tokens for insert to authenticated with check (member_id = public.my_member_id());
drop policy if exists "token own update" on public.calendar_tokens;
create policy "token own update" on public.calendar_tokens for update to authenticated
  using (member_id = public.my_member_id()) with check (member_id = public.my_member_id());

-- ═════════════ 0003: social posting and analytics ═════════════

create or replace function public.can_post_social() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
     where user_id = auth.uid() and status <> 'inactive'
       and (role in ('admin','head') or department_id = 'social')
  )
$$;

-- OAuth tokens. RLS on with no policies: only the server (service role) can read it.
create table if not exists public.social_accounts (
  platform text primary key check (platform in ('instagram','tiktok')),
  account_id text not null,
  username text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  refresh_expires_at timestamptz,
  scopes text,
  connected_by uuid references public.members(id) on delete set null,
  connected_at timestamptz not null default now()
);
alter table public.social_accounts enable row level security;

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.members(id) on delete set null,
  caption text not null default '',
  media jsonb not null default '[]'::jsonb,
  content_item_id uuid references public.content_items(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists social_posts_created_at_idx on public.social_posts (created_at desc);

create table if not exists public.social_post_targets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  platform text not null check (platform in ('instagram','tiktok')),
  status text not null default 'pending'
    check (status in ('pending','processing','published','sent_to_drafts','failed')),
  state jsonb not null default '{}'::jsonb,
  remote_id text,
  permalink text,
  error text,
  attempts int not null default 0,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (post_id, platform)
);
create index if not exists social_post_targets_status_idx on public.social_post_targets (status);

alter table public.social_posts enable row level security;
alter table public.social_post_targets enable row level security;
drop policy if exists "social posts readable" on public.social_posts;
create policy "social posts readable" on public.social_posts for select to authenticated using (true);
drop policy if exists "social posts insert" on public.social_posts;
create policy "social posts insert" on public.social_posts for insert to authenticated
  with check (public.can_post_social() and created_by = public.my_member_id());
drop policy if exists "social targets readable" on public.social_post_targets;
create policy "social targets readable" on public.social_post_targets for select to authenticated using (true);

create table if not exists public.social_media_stats (
  platform text not null check (platform in ('instagram','tiktok')),
  remote_id text not null,
  caption text,
  media_type text,
  permalink text,
  thumbnail_url text,
  posted_at timestamptz,
  views int,
  reach int,
  likes int,
  comments int,
  shares int,
  saves int,
  updated_at timestamptz not null default now(),
  primary key (platform, remote_id)
);
create index if not exists social_media_stats_posted_at_idx on public.social_media_stats (posted_at desc);

create table if not exists public.social_account_stats (
  platform text not null check (platform in ('instagram','tiktok')),
  day date not null,
  followers int,
  following int,
  posts int,
  total_likes int,
  primary key (platform, day)
);

alter table public.social_media_stats enable row level security;
alter table public.social_account_stats enable row level security;
drop policy if exists "media stats readable" on public.social_media_stats;
create policy "media stats readable" on public.social_media_stats for select to authenticated using (true);
drop policy if exists "account stats readable" on public.social_account_stats;
create policy "account stats readable" on public.social_account_stats for select to authenticated using (true);

-- Public bucket: Instagram and TikTok fetch files from their public URLs.
insert into storage.buckets (id, name, public, file_size_limit)
values ('social', 'social', true, 524288000)
on conflict (id) do nothing;

drop policy if exists "social upload" on storage.objects;
create policy "social upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'social' and public.can_post_social());
drop policy if exists "social delete" on storage.objects;
create policy "social delete" on storage.objects for delete to authenticated
  using (bucket_id = 'social' and public.can_post_social());

-- ═════════════ 0004: media cleanup ═════════════

alter table public.social_posts add column if not exists media_deleted_at timestamptz;

commit;

-- Tell the API about the new tables straight away (otherwise it can take a minute).
notify pgrst, 'reload schema';
