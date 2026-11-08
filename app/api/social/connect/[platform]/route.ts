import { NextResponse, type NextRequest } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { igAuthUrl, igConfigured } from '@/lib/social/instagram';
import { ttAuthUrl, ttConfigured } from '@/lib/social/tiktok';
import { isPlatform, redirectUri, siteUrl, STATE_COOKIE } from '@/lib/social/oauth';

export const dynamic = 'force-dynamic';

/** Admin starts the OAuth flow to link the unit's Instagram or TikTok account. */
export async function GET(request: NextRequest, { params }: { params: { platform: string } }) {
  const site = siteUrl(request.nextUrl.origin);
  const { member } = await getSession();
  if (!isAdmin(member)) return NextResponse.redirect(`${site}/social?error=${encodeURIComponent('Only an admin can connect accounts.')}`);
  if (!isPlatform(params.platform)) return NextResponse.redirect(`${site}/social`);

  const configured = params.platform === 'instagram' ? igConfigured() : ttConfigured();
  if (!configured) {
    return NextResponse.redirect(`${site}/social?error=${encodeURIComponent(`Add the ${params.platform === 'instagram' ? 'INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET' : 'TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET'} environment variables first.`)}`);
  }

  const state = crypto.randomUUID();
  const uri = redirectUri(site, params.platform);
  const res = NextResponse.redirect(params.platform === 'instagram' ? igAuthUrl(uri, state) : ttAuthUrl(uri, state));
  res.cookies.set(STATE_COOKIE, `${params.platform}:${state}`, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/' });
  return res;
}
