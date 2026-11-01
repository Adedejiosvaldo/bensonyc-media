export const COLORS = [
  { name: 'YC Plum', token: 'plum-700', hex: '#5B1453', use: 'The ground of every flyer, reel cover and highlight. About 60% of any graphic.', text: 'light' },
  { name: 'Deep Plum', token: 'plum-950', hex: '#1E0820', use: 'Night backgrounds, stage screens, text on cream.', text: 'light' },
  { name: 'MFM Magenta', token: 'magenta', hex: '#D6197A', use: 'Badges, buttons and the one key word in a headline.', text: 'light' },
  { name: 'Flame Gold', token: 'gold', hex: '#F6B40E', use: 'One highlighted word or number per graphic, usually the date. On plum only.', text: 'dark' },
  { name: 'Cream', token: 'cream', hex: '#FFF3DF', use: 'Carousel slides, quote cards, birthday cards.', text: 'dark' },
] as const;

export const SIZES = [
  { post: 'Feed post / flyer', size: '1080 × 1350', note: '4:5. Keep key info inside the centre 1080 × 1440 for the grid crop.' },
  { post: 'Reel / story', size: '1080 × 1920', note: 'Keep text 250px clear of the top and 400px clear of the bottom.' },
  { post: 'Reel cover', size: '1080 × 1920', note: 'Face fills the frame, 3–4 word Anton title in the centre band.' },
  { post: 'Carousel', size: '1080 × 1350', note: 'Slide 1 hook on plum. Slides 2–6 on cream. Last slide: CTA + handle.' },
  { post: 'Highlight cover', size: '1080 × 1920', note: 'Plum ground, white line icon in the centre, no words.' },
];

export const SERIES = ['Sunday in 60', 'YC Notes', 'Faces of YC', 'Inside YC', 'Friday Fire', 'Kingdom Business Minute', 'See You Sunday', 'Live from YC'];

export const HERO_FORMATS = ['Post', 'Reel', 'Story', 'Carousel'] as const;

export const DO = [
  'A real face on every flyer',
  'Hook in the first 2 seconds of every reel',
  'Burned-in captions on every reel',
  'Logo bottom-left, @mfmbensonyc beside it',
  'One call to action per post',
  'Vertical video, always',
];

export const DONT = [
  'Logo-only or text-only posts',
  'More than 3 brand colours on one graphic',
  'Gold text on white (unreadable)',
  'Magenta text on plum (it vibrates)',
  'Horizontal video or reels without captions',
  'Stretched, recoloured or boxed logo',
];
