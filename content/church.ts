// Facts shown on the public church page (/church). Edit here.
// ⚠ Items marked CONFIRM are placeholders: check them before sharing the page.

export const CHURCH = {
  name: 'MFM Benson Youth Church',
  short: 'Benson YC',
  motto: 'Citadel of Greatness',
  parent: 'Mountain of Fire and Miracles Ministries',
  area: 'Benson, Ikorodu, Lagos', // CONFIRM: full street address
  mapsQuery: 'MFM Benson Youth Church, Ikorodu, Lagos', // what "Get directions" searches for in Google Maps
  instagram: 'mfmbensonyc',
  sunday: {
    label: 'Sunday service',
    timeLabel: '8:00am', // CONFIRM
    start: '08:00', // CONFIRM (Lagos time, 24h)
    end: '11:00', // CONFIRM
  },
};

/** What a first visit looks like. Keep each line short and true. */
export const FIRST_VISIT = [
  { title: 'Come as you are', text: 'Jeans or native, early or a little late. Sit anywhere; the front rows are the loudest.', tone: 'plum' },
  { title: 'Worship', text: 'Loud, joyful and fully alive. The lyrics are on the screen, so sing along.', tone: 'cream' },
  { title: 'The Word', text: 'A message for real life: school, work, family and purpose. Missed a point? It’s in Sunday in 60.', tone: 'magenta' },
  { title: 'Prayer', text: 'Fire-filled prayer is who we are. Bring what’s heavy and leave lighter.', tone: 'white' },
] as const;

/** The weekly Instagram series (from the brand guide), shown when no posts are synced yet. */
export const SERIES_TILES = ['Sunday in 60', 'YC Notes', 'Faces of YC', 'Inside YC', 'Friday Fire', 'See You Sunday'];
