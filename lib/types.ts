export type DepartmentId = 'projection' | 'photography' | 'content' | 'design' | 'social';
export type Role = 'member' | 'head' | 'admin';
export type MemberStatus = 'active' | 'on_break' | 'inactive';
export type ContentStatus = 'planned' | 'shot' | 'edited' | 'posted' | 'skipped';
export type Pillar = 'People' | 'Word' | 'Events' | 'Community';

export type Member = {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  department_id: DepartmentId | null;
  role: Role;
  status: MemberStatus;
  break_until: string | null;
  created_at: string;
};

export type PlanMonth = {
  id: string;
  month: string;
  theme: string;
  big_moment: string;
  hero_content: string;
  highlight: string | null;
  follower_target: number;
  followers_actual: number | null;
  notes: string | null;
};

export type ContentItem = {
  id: string;
  week_start: string;
  day: string;
  series: string;
  pillar: Pillar;
  format: string;
  title: string;
  brief: string;
  department_id: DepartmentId | null;
  owner_id: string | null;
  status: ContentStatus;
  link: string | null;
  sort: number;
};

export type RosterSlot = {
  id: string;
  week_id: string;
  service_date: string;
  service_label: string;
  department_id: DepartmentId;
  duty: string;
  member_id: string | null;
  sort: number;
};

export type Blockout = {
  id: string;
  member_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_at: string;
};

export type SwapStatus = 'open' | 'taken' | 'cancelled';

export type SwapRequest = {
  id: string;
  slot_id: string;
  from_member: string;
  to_member: string | null;
  note: string | null;
  status: SwapStatus;
  created_at: string;
  resolved_at: string | null;
};
