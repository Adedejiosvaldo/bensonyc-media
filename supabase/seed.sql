-- Benson YC Media Unit — starting data. Run once after 0001_init.sql.

insert into public.departments (id, name, short, sort) values
  ('projection',  'Projection',              'Cameras, laptop and TV every service', 1),
  ('photography', 'Photography & Editing',   'Pictures before, during and after service', 2),
  ('content',     'Content Creation',        'Reels, sermon recording and weekly content', 3),
  ('design',      'Design',                  'Flyers, Face of the Week, carousels', 4),
  ('social',      'Social Media',            'WhatsApp, Instagram and Facebook', 5)
on conflict (id) do nothing;

-- Known members. They "claim" their row when they register with the same first name and department.
insert into public.members (full_name, department_id, role, status, break_until) values
  ('Emmanuel', 'projection', 'head',   'active', null),
  ('David',    'projection', 'member', 'active', null),
  ('James',    'projection', 'member', 'active', null),
  ('Divine',   'projection', 'member', 'active', null),
  ('Jeremiah', 'projection', 'member', 'active', null),
  ('Lekan',    'projection', 'member', 'active', null),
  ('Monach',   'photography','member', 'active', null),
  ('Ruth',     'photography','member', 'on_break', '2026-11-22'),
  ('Doyin',    'photography','member', 'active', null),
  ('Gift',     'photography','member', 'active', null),
  ('Godspower','photography','member', 'active', null);

-- 9-month master plan (Nov 2026 – Jul 2027). Edit in Admin → Master plan.
insert into public.plan_months (month, theme, big_moment, hero_content, highlight, follower_target) values
  ('2026-11-01','Relaunch: This is YC','Thanksgiving Sunday','"What is Benson YC?" 45s face-montage reel; bio + highlight relaunch','New Here, Service Times',1000),
  ('2026-12-01','Home for Christmas','Carol night; Christmas and crossover service','Carol reel with crowd singing; "2026 at YC in 60 seconds" recap','Events',1350),
  ('2027-01-01','New Year, New Fire','New Year prayer and fasting','21-day devotional carousel series; "Write your 2027 prayer" stories prompt','Sermons',1800),
  ('2027-02-01','Love, Done God''s Way','Singles and relationships Sunday (Valentine week)','"Ask YC" street-style relationship reels; collab with a known Christian couple','Faces of YC',2500),
  ('2027-03-01','Risen','Easter: Good Friday 26 Mar, Easter Sunday 28 Mar','Easter drama or spoken-word reel; "Bring 1 to Easter" invite campaign','Testimonies',3400),
  ('2027-04-01','Exam Season Grace','Exam prayer service for UTME and WAEC candidates','"Study with YC" tips reels; exam prayer carousel to save and send','Events',4600),
  ('2027-05-01','Next Gen','Children''s Day week (27 May); youth talent showcase','Talent showcase clips; Faces of YC run with student leaders','Faces of YC',6000),
  ('2027-06-01','Halfway There','Mid-year thanksgiving','Testimony marathon: one testimony reel a day for 7 days','Testimonies',7800),
  ('2027-07-01','10K Strong','10k celebration Sunday; youth camp or retreat','Thank-you reel; camp recap','10K',10000)
on conflict (month) do nothing;

-- After you sign in once with your own email, make yourself admin:
-- update public.members set role = 'admin' where email = 'YOUR-EMAIL';
