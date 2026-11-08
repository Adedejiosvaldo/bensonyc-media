-- Post once to Instagram and TikTok, and track how posts are doing.
-- Run after 0002 in Supabase → SQL Editor.

-- Who may post: heads, admins and the Social Media department.
create or replace function public.can_post_social() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
     where user_id = auth.uid() and status <> 'inactive'
       and (role in ('admin','head') or department_id = 'social')
  )
$$;

-- ───────────── Connected accounts ─────────────
-- Holds OAuth tokens. RLS is on with NO policies: only the server (service role) can read it.
create table public.social_accounts (
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

-- ───────────── Posts made from the app ─────────────
create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.members(id) on delete set null,
  caption text not null default '',
  -- [{ "path": "...", "url": "https://...", "type": "image" | "video", "size": 123 }]
  media jsonb not null default '[]'::jsonb,
  content_item_id uuid references public.content_items(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.social_posts (created_at desc);

create table public.social_post_targets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  platform text not null check (platform in ('instagram','tiktok')),
  status text not null default 'pending'
    check (status in ('pending','processing','published','sent_to_drafts','failed')),
  -- step-by-step progress (container ids, upload chunk, publish id…)
  state jsonb not null default '{}'::jsonb,
  remote_id text,
  permalink text,
  error text,
  attempts int not null default 0,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (post_id, platform)
);
create index on public.social_post_targets (status);

alter table public.social_posts enable row level security;
alter table public.social_post_targets enable row level security;
create policy "social posts readable" on public.social_posts for select to authenticated using (true);
create policy "social posts insert" on public.social_posts for insert to authenticated
  with check (public.can_post_social() and created_by = public.my_member_id());
create policy "social targets readable" on public.social_post_targets for select to authenticated using (true);
-- targets are created and advanced by the server

-- ───────────── Analytics ─────────────
-- Recent posts on each account (from the app or not) with their latest numbers.
create table public.social_media_stats (
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
create index on public.social_media_stats (posted_at desc);

-- One row per account per day, for follower growth.
create table public.social_account_stats (
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
create policy "media stats readable" on public.social_media_stats for select to authenticated using (true);
create policy "account stats readable" on public.social_account_stats for select to authenticated using (true);

-- ───────────── Media storage ─────────────
-- Public bucket: Instagram and TikTok fetch the files from their public URLs.
insert into storage.buckets (id, name, public, file_size_limit)
values ('social', 'social', true, 524288000)  -- 500 MB
on conflict (id) do nothing;

create policy "social upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'social' and public.can_post_social());
create policy "social delete" on storage.objects for delete to authenticated
  using (bucket_id = 'social' and public.can_post_social());
