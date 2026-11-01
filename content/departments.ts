import type { DepartmentId } from '@/lib/types';

export type DepartmentGuide = {
  id: DepartmentId;
  name: string;
  tagline: string;
  focus?: boolean;
  mission: string;
  responsibilities: string[];
  before: string[];
  during: string[];
  after: string[];
  extra?: { title: string; items: string[] }[];
  standard: string;
  needs?: string;
};

export const DEPARTMENTS: DepartmentGuide[] = [
  {
    id: 'projection',
    name: 'Projection',
    tagline: 'If the screen is dark, the room feels it.',
    mission:
      'You make sure everyone in the hall and everyone watching online sees and hears the service clearly, from the first song to the last announcement.',
    responsibilities: [
      'Set up the camera, laptop and TV before every service',
      'Run the camera through the service and switch operators at the halfway point so nobody gets tired',
      'Handle the laptop: lyrics, scripture, sermon points, announcements on the TV',
      'On special services, add a second angle with a phone camera',
      'Pack down and charge equipment after service',
    ],
    before: [
      'Arrive by 7:30am (grace till 8:00)',
      'Camera on tripod, battery full, memory card cleared',
      'Laptop connected to TV, slides and lyrics loaded and tested',
      'Check sound into the camera with the sound desk',
    ],
    during: [
      'Camera 1 runs until the sermon starts, then Camera 2 takes over',
      'Laptop follows the worship leader. Lyrics change before the line starts, not after',
      'Scripture on screen within 5 seconds of the minister calling it',
      'Special service: phone camera on a stand, wide shot from the side',
    ],
    after: ['Stop recording and send the sermon file to Content', 'Charge camera batteries', 'Coil cables, store equipment', 'Report any fault to Emmanuel'],
    standard: 'Screen never blank during worship. Every scripture on screen. Sermon recorded start to finish.',
  },
  {
    id: 'photography',
    name: 'Photography & Editing',
    tagline: 'Faces, not furniture.',
    mission:
      'You capture the moments that make people want to be at YC, and you deliver edited pictures before service ends so Social can post while the moment is still warm.',
    responsibilities: [
      'Charge all batteries the night before',
      'Take pre-service pictures: arrivals, greeters, members at the gate',
      'Capture the key moments in service',
      'Edit and send the best pictures before service ends',
      'Two photographers per Sunday: one roams, one covers the stage and edits',
    ],
    before: ['Batteries charged, cards empty, lens cleaned', 'Arrive by 7:30am', 'Pre-service shots: 10+ smiling arrivals and group shots at the gate'],
    during: [
      'Worship: hands raised, eyes closed, singing faces (shoot from the side and front, never only backs of heads)',
      'Minister: 3–5 strong expressions, gesturing, Bible open',
      'Choir mid-note, instruments, the congregation responding',
      'First-timers welcome moment, testimonies, offering dance',
      'Wide shot of the full hall at its fullest moment',
    ],
    after: [
      'Pick the best 20, edit, send to Social before service closes',
      'Full album to the drive by Monday evening',
      'Group photos after service: natural laughter, not stiff rows',
    ],
    extra: [
      {
        title: 'Picture criteria (a photo goes out only if)',
        items: [
          'The face is sharp and the eyes are visible',
          'The light is on the face. No dark faces against bright stage lights',
          'The horizon is straight and there is no clutter cutting through heads',
          'The person looks good: no mid-blink, mid-chew or awkward angle',
          'Emotional moments (crying, altar) are posted only with permission',
          'Edit: warm natural tone, lift shadows slightly, no heavy filters',
        ],
      },
    ],
    standard: 'At least 20 edited pictures delivered before service ends.',
  },
  {
    id: 'content',
    name: 'Content Creation',
    tagline: 'This team decides whether we hit 10K.',
    focus: true,
    mission:
      'You turn every service and every week into reels people want to watch, save and share. This is the engine of our growth, so it carries the highest standard of commitment in the unit.',
    responsibilities: [
      'Capture in-service content from the shot list below',
      'Record the sermon on phone as backup, with clean audio from the desk (starting now)',
      'Capture after-service content: interviews, reactions, fun',
      'Edit and deliver the reels on the weekly content board by their due day',
      'Bring 1 new content idea to the group every week',
    ],
    before: ['Phone charged, storage cleared, lapel mic charged', 'Check this week’s board: know which reels you owe', 'Arrive by 7:30am'],
    during: [
      'Worship: 3 vertical clips of 10–15s (wide, close face, hands raised)',
      'Sermon: mark the time of the 2–3 strongest lines for “Sunday in 60”',
      'Testimonies: record vertically, close enough to hear',
      'Atmosphere: people arriving, greeting, the hall filling up',
    ],
    after: [
      '2 short interviews: “What did today’s message do for you?”',
      'Faces of YC: film this week’s spotlight member (20–45s)',
      'Fun: a clean trend or challenge with 3–5 members',
      'Upload all raw clips to the shared folder the same day',
    ],
    extra: [
      {
        title: 'Weekly content you own (from the board)',
        items: [
          'Mon: Sunday in 60, sermon clip with captions',
          'Wed: Faces of YC, member spotlight',
          'Thu: Inside YC, behind the scenes, plus the monthly hero post',
          'Fri: Friday Fire, or Kingdom Business Minute every other week',
        ],
      },
      {
        title: 'Engagement ideas for the week',
        items: [
          'Kingdom Business Minute: 60–90s with a member who runs a business: one lesson + one scripture',
          '“Finish the verse”: Instagram stories quiz, Tuesday',
          '“Ask YC”: street-style questions after service (faith, relationships, career)',
          'Bible trivia sticker poll on Thursday stories',
          'Throwback Thursday: old service clips side by side with today',
          'Prayer requests box on Wednesday stories, prayed over at midweek',
        ],
      },
      {
        title: 'Commitment',
        items: [
          'Missed two assigned reels in a month = conversation with the unit head',
          'Can’t make your duty? Swap with someone and tell the head by Friday',
          'Raw clips not uploaded by Sunday night counts as a missed duty',
        ],
      },
    ],
    standard: 'Every reel captioned, vertical, hook in 2 seconds, delivered by its due day.',
  },
  {
    id: 'design',
    name: 'Design',
    tagline: 'Every graphic should look like it came from one church.',
    focus: true,
    mission:
      'You keep every flyer, carousel, cover and Face of the Week consistent with the brand guide, so our feed looks like one church and not five phones.',
    responsibilities: [
      'Face of the Week, every Sunday (bring it back)',
      'Event flyers: one template, always from the brand guide',
      'Reel covers for every reel on the board',
      'Teaching carousels (YC Notes) every Tuesday',
      'Highlight covers and pinned posts each month',
    ],
    before: ['Flyer for next Sunday approved by Thursday', 'Face of the Week chosen with Content by Saturday', 'Reel covers ready the day before each post'],
    during: ['Watch for the Face of the Week moment and get the photo from Photography'],
    after: ['Face of the Week posted by Sunday evening', 'Update templates if anything changed'],
    extra: [
      {
        title: 'Using AI tools',
        items: [
          'AI is fine for drafts, backgrounds and layout ideas',
          'Final design must use our fonts (Anton + Plus Jakarta Sans), colours and logo',
          'Always a real member’s face over an AI-generated person',
          'Check spelling of names, dates and scripture references twice',
        ],
      },
    ],
    standard: 'Nothing goes out off-template. Every flyer has a face, the date, time, venue and logo.',
    needs: 'We need at least one more designer to help with Face of the Week and flyers.',
  },
  {
    id: 'social',
    name: 'Social Media',
    tagline: 'WhatsApp is where we are. Instagram is where we grow.',
    focus: true,
    mission:
      'You manage our community on WhatsApp, Instagram and Facebook: posting on schedule, replying to people, and pushing our WhatsApp traction across to Instagram.',
    responsibilities: [
      'Post every item on the weekly board on its day (uploading is not one person’s job anymore)',
      'Live stories during Sunday service',
      'Reply to every comment and DM within 24 hours',
      'Share each Instagram post to WhatsApp status and groups with the IG link',
      'Track the monthly numbers: followers, reach, profile visits',
    ],
    before: ['Check the board on Saturday: what goes out this week and who uploads', 'Captions drafted the day before'],
    during: ['6–10 stories through service', 'Repost members’ stories that tag @mfmbensonyc'],
    after: [
      'Post edited pictures on Sunday evening',
      'Push to WhatsApp: “New on our IG 👇 [link]”, every post, every time',
      'Answer comments and DMs',
    ],
    extra: [
      {
        title: 'Moving WhatsApp people to Instagram',
        items: [
          'Never post the full video on WhatsApp. Post a 5s teaser + the IG link',
          'Monthly WhatsApp broadcast: “Follow us on IG for [this month’s series]”',
          'Shout out new followers by name in Friday stories',
          'Announce the follower count at the end of service once a month',
        ],
      },
    ],
    standard: 'Nothing on the board goes unposted. Every post shared to WhatsApp with the IG link.',
  },
];

export const departmentById = (id: string | null | undefined) => DEPARTMENTS.find((d) => d.id === id) ?? null;
