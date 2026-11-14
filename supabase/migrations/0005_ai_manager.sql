-- AI social media manager: weekly post suggestions built from the unit's own numbers, the 9-month plan
-- and reference posts found on the web. Safe to run more than once.
-- Run in Supabase → SQL Editor after 0004 (or after supabase/catchup_0002_to_0004.sql).

begin;

-- One row per request to the model (weekly or on demand). The model runs as a Message Batch, so a run
-- stays "queued" until a later check collects the result.
create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  status text not null default 'queued' check (status in ('queued','done','failed')),
  batch_id text,
  requested_by uuid references public.members(id) on delete set null,
  summary text,
  insights jsonb not null default '[]'::jsonb,
  usage jsonb,
  error text,
  -- The request sent to the model, kept so a turn that pauses mid-search can be continued.
  request jsonb,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
alter table public.ai_runs add column if not exists request jsonb;
alter table public.ai_runs add column if not exists attempts int not null default 0;
create index if not exists ai_runs_week_idx on public.ai_runs (week_start, created_at desc);

-- Suggested posts. "Add to board" turns one into a content item.
create table if not exists public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_runs(id) on delete cascade,
  week_start date not null,
  day date not null,
  series text not null,
  pillar text not null,
  format text not null,
  department_id text,
  title text not null,
  hook text not null,
  caption text not null,
  shot_notes text not null default '',
  why text not null,
  refs jsonb not null default '[]'::jsonb,
  status text not null default 'new' check (status in ('new','added','dismissed')),
  content_item_id uuid references public.content_items(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists ai_suggestions_week_idx on public.ai_suggestions (week_start);

-- Public Instagram accounts the model chose to learn from. Each run reads their recent posts
-- (real like and comment counts through Instagram's business discovery) before asking for new ideas.
create table if not exists public.ai_peer_accounts (
  username text primary key,
  why text,
  added_at timestamptz not null default now(),
  last_checked timestamptz,
  ok boolean
);

-- Readable by the people who can post (heads, admins, Social Media). All writes go through the server.
alter table public.ai_runs enable row level security;
alter table public.ai_suggestions enable row level security;
alter table public.ai_peer_accounts enable row level security;
drop policy if exists "ai runs readable" on public.ai_runs;
create policy "ai runs readable" on public.ai_runs for select to authenticated using (public.can_post_social());
drop policy if exists "ai suggestions readable" on public.ai_suggestions;
create policy "ai suggestions readable" on public.ai_suggestions for select to authenticated using (public.can_post_social());
drop policy if exists "ai peers readable" on public.ai_peer_accounts;
create policy "ai peers readable" on public.ai_peer_accounts for select to authenticated using (public.can_post_social());

commit;

notify pgrst, 'reload schema';
