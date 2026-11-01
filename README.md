# Benson YC Media

The web app for the MFM Benson Youth Church media unit. It covers onboarding, the brand guide, department responsibilities, the rules pledge, the 9-month content plan, weekly content boards, fair duty rosters and Saturday reminder emails.

**Stack:** Next.js 14 (App Router, server actions), Supabase (Postgres, magic-link auth, row level security), Tailwind, Resend for email, and Vercel with cron. Every service has a free tier that covers a unit this size.

## What's inside

| Area | Who | What it does |
| --- | --- | --- |
| Landing `/` | Anyone | What the unit is, the 10K goal, a join button |
| Sign in `/login` | Anyone | Magic-link email, no passwords |
| Join `/join` | New members | Name, WhatsApp number, department. It claims a pre-listed name (e.g. "David", Projection) automatically |
| Onboarding `/onboarding` | Members | 6 lessons: welcome, brand, rules and pledge, your department, how a week works, the 9-month plan. Progress is saved |
| Home `/home` | Members | Your duty this Sunday, course progress, content you own, this month's theme |
| This week `/content` | Members | The Sun to Sat board **generated from the 9-month plan**. Change owner and status inline |
| Roster `/roster` | Members (heads and admins generate) | Fair shuffle, camera halves split, people on break skipped, special-service phone camera, optional midweek service, a WhatsApp message to copy |
| 9-month plan `/plan` | Members | Monthly themes, big moments, hero content, targets vs actual followers |
| Departments, Brand, Rules | Members | Responsibilities per team, the full brand guide, rules plus who has signed |
| Admin `/admin` | Heads (view), admins (edit) | Registration, course and pledge tracking; edit department, role, status and breaks; edit the plan |
| Cron `/api/cron/reminders` | Vercel | Saturday 4pm Lagos: emails each person on tomorrow's roster their duty, checklist and the content they own |

### How the weekly board comes from the master plan
`lib/plan.ts` takes the month a week falls in (by its Wednesday) and builds:
- the 7-day rhythm: Live from YC, Sunday in 60, YC Notes, Faces of YC, Inside YC, Friday Fire, See You Sunday. Every second week, Friday becomes the **Kingdom Business Minute**;
- one **monthly hero** post on Thursday. Week 1 launches the theme, week 2 is the month's hero content, week 3 is the countdown to the big moment, week 4+ is the recap.

Briefs pull in the month's theme and big moment. Edit the plan in **Admin → Edit 9-month plan**, then rebuild the week.

### How the roster stays fair
`lib/roster.ts` ranks each department by duties in the last 8 weeks (fewest first, ties random). Nobody gets two duties in the same department at the same service unless the team is too small. Members marked *on break* are skipped until their `break_until` date.

## Set it up (about 20 minutes)

1. **Supabase**: create a free project at supabase.com.
   - SQL Editor → run `supabase/migrations/0001_init.sql`, then `supabase/seed.sql`.
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
