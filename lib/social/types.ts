export type Platform = 'instagram' | 'tiktok';
export const PLATFORMS: Platform[] = ['instagram', 'tiktok'];
export const PLATFORM_NAME: Record<Platform, string> = { instagram: 'Instagram', tiktok: 'TikTok' };

export type MediaFile = { path: string; url: string; type: 'image' | 'video'; size: number; mime?: string };

export type SocialAccount = {
  platform: Platform;
  account_id: string;
  username: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  refresh_expires_at: string | null;
  scopes: string | null;
};

export type TargetStatus = 'pending' | 'processing' | 'published' | 'sent_to_drafts' | 'failed';

export type SocialPost = {
  id: string;
  created_by: string | null;
  caption: string;
  media: MediaFile[];
  content_item_id: string | null;
  created_at: string;
  media_deleted_at: string | null;
};

export type SocialTarget = {
  id: string;
  post_id: string;
  platform: Platform;
  status: TargetStatus;
  state: Record<string, unknown>;
  remote_id: string | null;
  permalink: string | null;
  error: string | null;
  attempts: number;
  published_at: string | null;
  updated_at: string;
};

export type MediaStat = {
  platform: Platform;
  remote_id: string;
  caption: string | null;
  media_type: string | null;
  permalink: string | null;
  thumbnail_url: string | null;
  posted_at: string | null;
  views: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  updated_at: string;
};

export type AccountStat = {
  platform: Platform;
  day: string;
  followers: number | null;
  following: number | null;
  posts: number | null;
  total_likes: number | null;
};

/** Thrown for errors a person should read (shown on the post). */
export class SocialError extends Error {}
