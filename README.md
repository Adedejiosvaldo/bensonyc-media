# Benson YC Media

The web app for the MFM Benson Youth Church media unit. It covers onboarding, the brand guide, department responsibilities, the rules pledge, the 9-month content plan, weekly content boards, fair duty rosters and Saturday reminder emails.

**Stack:** Next.js 14 (App Router, server actions), Supabase (Postgres, magic-link auth, row level security), Tailwind, Resend for email, and Vercel with cron. Every service has a free tier that covers a unit this size.

## What's inside

| Area | Who | What it does |
| --- | --- | --- |
| Media site `/` | Anyone | The media unit's public page: crew call sheet, department directory, weekly production rhythm, recruitment and member sign-in. The authenticated workspace contains roster, onboarding, publishing and planning tools. |
| Church site `/church` | Anyone | A separate visitor-first church site: Sunday arrival details, directions and calendar, first-visit guidance, the year ahead (from the 9-month plan), and Instagram updates. On the church domain, `CHURCH_HOST` serves this at `/`. Edit facts in `content/church.ts`. |
| Sign in `/login` | Anyone | Magic-link email, no passwords |
| Join `/join` | New members | Name, WhatsApp number, department. It claims a pre-listed name (e.g. "David", Projection) automatically |
| Onboarding `/onboarding` | Members | 6 lessons: welcome, brand, rules and pledge, your department, how a week works, the 9-month plan. Progress is saved |
| Home `/home` | Members | Your duty this Sunday, course progress, content you own, this month's theme |
| This week `/content` | Members | The Sun to Sat board **generated from the 9-month plan**. Change owner and status inline |
| Roster `/roster` | Members (heads and admins generate) | Fair shuffle, camera halves split, people on break or blocked out skipped, special-service phone camera, optional midweek service, a WhatsApp message to copy. **Duty swaps**: ask for cover on your duty and anyone in your department can take it, no admin needed |
| Availability `/availability` | Members | Block out dates you can't serve (the roster skips you), see who's away in the next 6 weeks, and subscribe to a private **calendar feed** of your duties and content (Google, Apple, Outlook) |
| 9-month plan `/plan` | Members | Monthly themes, big moments, hero content, targets vs actual followers |
| Departments, Brand, Rules | Members | Responsibilities per team, the full brand guide, rules plus who has signed |
| Admin `/admin` | Heads (view), admins (edit) | Registration, course and pledge tracking; edit department, role, status and breaks; edit the plan |
| Calendar `/api/calendar/<token>` | Anyone with the secret link | Read-only iCalendar feed for one member. Reset the link on Availability to cut off an old one |
| Post `/social` | Heads, admins, Social Media team | Upload photos or a video once and it goes to **Instagram and TikTok**. Several photos become a carousel. Link it to an item on the weekly board and that item is marked posted with the link filled in. Admins connect the accounts here |
| Insights `/insights` | Members | Followers per platform with 7- and 30-day change, combined followers vs this month's plan target, views/likes/comments/shares for the last 30 days, and every recent post ranked by engagement or views |
| Cron `/api/cron/social` | Vercel, daily 6am Lagos | Finishes any half-done uploads, clears posted files from storage, refreshes logins and pulls the latest numbers |
| Cron `/api/cron/reminders` | Vercel | Saturday 4pm Lagos: emails each person on tomorrow's roster their duty, checklist and the content they own |

### How the weekly board comes from the master plan
`lib/plan.ts` takes the month a week falls in (by its Wednesday) and builds:
- the 7-day rhythm: Live from YC, Sunday in 60, YC Notes, Faces of YC, Inside YC, Friday Fire, See You Sunday. Every second week, Friday becomes the **Kingdom Business Minute**;
- one **monthly hero** post on Thursday. Week 1 launches the theme, week 2 is the month's hero content, week 3 is the countdown to the big moment, week 4+ is the recap.

Briefs pull in the month's theme and big moment. Edit the plan in **Admin → Edit 9-month plan**, then rebuild the week.

### How the roster stays fair
`lib/roster.ts` ranks each department by duties in the last 8 weeks (fewest first, ties random). Nobody gets two duties in the same department at the same service unless the team is too small. Members marked *on break* are skipped until their `break_until` date, and anyone with a blockout covering the service date is skipped too.

### How swaps work
On the Roster page, tap **Ask for a swap** on your duty. Everyone else in your department gets an email and sees a gold *Needs cover* card on Home and the Roster. The first person to tap **Take this duty** gets the slot and you get an email saying you're covered. The database functions `request_swap`, `take_swap` and `cancel_swap` check that only your own duty can be offered and only someone in the same department can take it.

## Set it up (about 20 minutes)

1. **Supabase**: create a free project at supabase.com.
   - SQL Editor → run `supabase/migrations/0001_init.sql`, then `supabase/seed.sql`, then `supabase/migrations/0002_availability_swaps_calendar.sql`.
   - Already running the app? Just run `0002_availability_swaps_calendar.sql` to add availability, swaps and calendar feeds.
   - Authentication → URL Configuration: set **Site URL** to your Vercel URL and add `https://YOUR-SITE/auth/callback` to Redirect URLs.
   - Authentication → Email: the built-in sender is rate-limited. For more than a handful of sign-ins a day, set custom SMTP (you can use Resend's SMTP).
2. **Resend**: create a free account, verify a sending domain (or start with `onboarding@resend.dev` for testing), copy the API key.
3. **Vercel**: import this repo, then add the variables from `.env.example`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `RESEND_FROM`, `CRON_SECRET`. Deploy.
4. **Make yourself admin**: sign in once, complete Join, then in the SQL Editor:
   ```sql
   update public.members set role = 'admin' where email = 'your@email.com';
   ```
5. Share the link in the media WhatsApp group: *"Open, sign in with your email, finish onboarding and sign the pledge before Sunday."*

### Test the reminder without sending
```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://YOUR-SITE/api/cron/reminders?dry=1"
```

## Social posting (Instagram + TikTok)

Run `supabase/migrations/0003_social_publishing.sql` and `0004_media_cleanup.sql` first. Then set up media storage (below).

**What to expect from each platform**
- **Instagram** posts go live straight away. The account must be a **Professional account (Business or Creator)**. Because the app only posts to the unit's own account, you can keep the Meta app in development mode and add the account as a tester; App Review isn't needed for that.
- **TikTok** lets an app post publicly only after TikTok audits it. Until then, the app sends videos to the account's **TikTok drafts** (`TIKTOK_POST_MODE=inbox`): open TikTok on the unit phone, paste the caption, add a sound and tap Post. After the audit passes, set `TIKTOK_POST_MODE=direct`.
- **Photos on TikTok** are pulled from a URL, and TikTok only pulls from domains you've verified. Verify your site's domain (or the `https://YOUR-SITE/api/media/` URL prefix) in the TikTok developer portal. Videos are pushed directly, so they don't need this.
- Files are **deleted from storage automatically** once a post is live on every platform you picked (Instagram and TikTok keep their own copies). If a platform fails, the files are kept 7 days so you can retry, then cleared.

**Media storage: Cloudflare R2 (recommended)**

Instagram and TikTok download each file from a public link, so the files need a home. R2's free plan gives 10 GB, files up to 5 GB, and free downloads. Without R2 the app falls back to Supabase storage (50 MB per file, 1 GB total, 5 GB downloads a month).
1. dash.cloudflare.com → **R2** → Create bucket, e.g. `bensonyc-media`.
2. Bucket → Settings → **Public access**: connect a custom domain such as `media.yourdomain.com` (best), or turn on the r2.dev URL. Put that URL in `R2_PUBLIC_URL`.
3. Bucket → Settings → **CORS policy**, so phones can upload straight to it:
   ```json
   [{ "AllowedOrigins": ["https://YOUR-SITE"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["Content-Type"], "MaxAgeSeconds": 3600 }]
   ```
4. Bucket → Settings → **Object lifecycle rules**: add "delete objects after 14 days" as a safety net for uploads that were never posted.
5. R2 → **Manage API tokens** → Create token with *Object Read & Write* on this bucket only. Put the Access Key ID and Secret in `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`, and your account ID (shown on the R2 page) in `R2_ACCOUNT_ID`.

With R2 on a custom domain, you can verify that domain with TikTok for photo posts instead of the `/api/media/` prefix.

**Instagram setup (new Meta apps: Unified login)**

Meta no longer offers "API setup with Instagram login" to new apps; they use **Unified login** (Facebook Login for Business). The app supports both, and switches to Unified login when `INSTAGRAM_CONFIG_ID` is set.
1. developers.facebook.com → your app → **Use cases** → *Manage messaging & content on Instagram* → **Customise** → **API setup with Unified login**.
2. Under *Configure your app*, create a configuration: login variation **General**, token **System-user access token**, expiration **Never**, asset **Instagram account**. Permissions must include `instagram_basic`, `instagram_content_publish` and `instagram_manage_insights` (for Insights).
3. Register the redirect URL `https://YOUR-SITE/api/social/callback/instagram` on that configuration.
4. Add the unit's Instagram account under *Roles → Instagram testers* and accept the invite in Instagram (Settings → Website permissions → Apps and websites).
5. On Vercel set `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET` to the **Meta app ID and secret** (App settings → Basic) and `INSTAGRAM_CONFIG_ID` to the configuration's ID. Redeploy.

Development mode is enough while the app only posts to an account with a role on it; App Review is only needed for other people's accounts. Unified-login tokens don't expire, so there's nothing to refresh. They stop working if the app is removed from the business's connected apps, and then an admin connects again.

*Older apps with Instagram login:* leave `INSTAGRAM_CONFIG_ID` unset, use the **Instagram** app ID and secret from *API setup with Instagram login*, and set the same redirect URL there.

**TikTok setup**
1. developers.tiktok.com → Create app → add **Login Kit** and **Content Posting API** (turn on Direct Post if you plan to apply for the audit).
2. Scopes: `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.upload`, `video.publish`, `video.list`.
3. Redirect URI: `https://YOUR-SITE/api/social/callback/tiktok`. Add the unit's TikTok as a target user while in sandbox.
4. Copy the client key and secret into `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET`.

**Then:** an admin opens **Post → Connect** for each platform and signs in with the unit's account. Tokens are stored in a table only the server can read. Instagram logins last 60 days and TikTok's 365; the daily job refreshes them, and the Post page warns admins a week before one runs out.

## Church page on its own domain

`/church` works straight away. To make it the homepage of a separate domain (e.g. `bensonyc.org`), add that domain to the same Vercel project and set `CHURCH_HOST=bensonyc.org`. Visitors to that domain get the church website at `/`; the media website stays rooted at its own `NEXT_PUBLIC_SITE_URL`. Each site has its own homepage and visual system, with explicit links between them.

Before sharing it, confirm the service time and address in `content/church.ts` (marked CONFIRM).

## Local development
```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

## Monday routine (5 minutes)
1. **This week → next week arrow → Generate this week from the plan.** Assign owners.
2. **Roster → next week → Generate roster.** Tick *Special service* or *Midweek* if needed. Fix any slot by hand.
3. Saturday: emails go out automatically. Copy the WhatsApp message from the Roster page into the group.

## Files to know
- `content/departments.ts`: duties, checklists, picture criteria, content ideas. Edit the wording here.
- `content/rules.ts`: rules and the pledge text. Bump `RULES_VERSION` if the rules change.
- `content/lessons.ts`: course outline.
- `content/brand.ts`: colours, sizes, do's and don'ts.
- `public/logo.png`: replace with a high-resolution logo (the current file is 96px).
