-- Adds a structured format to each month's hero content (Post / Reel / Story / Carousel),
-- so "Hero content" on /plan shows what it actually is instead of relying on wording.

alter table public.plan_months
  add column hero_format text not null default 'Reel'
  check (hero_format in ('Post', 'Reel', 'Story', 'Carousel'));

-- Backfill the seeded months to match what their hero_content text already describes.
update public.plan_months set hero_format = 'Carousel' where month = '2027-01-01';
