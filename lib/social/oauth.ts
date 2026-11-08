import type { Platform } from './types';

export const isPlatform = (p: string): p is Platform => p === 'instagram' || p === 'tiktok';

export function siteUrl(fallbackOrigin: string) {
  return (process.env.NEXT_PUBLIC_SITE_URL || fallbackOrigin).replace(/\/$/, '');
}

/** Must match the redirect URI registered in the Meta / TikTok developer app exactly. */
export const redirectUri = (site: string, p: Platform) => `${site}/api/social/callback/${p}`;
export const STATE_COOKIE = 'social_oauth_state';
