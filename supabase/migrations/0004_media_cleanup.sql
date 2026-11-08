-- Files are deleted from storage once a post is live everywhere (Instagram and TikTok keep their own copies).
alter table public.social_posts add column if not exists media_deleted_at timestamptz;
