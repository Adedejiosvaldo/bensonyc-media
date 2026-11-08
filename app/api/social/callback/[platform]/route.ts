import { NextResponse, type NextRequest } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { igExchangeCode } from '@/lib/social/instagram';
import { ttExchangeCode, ttUser } from '@/lib/social/tiktok';
import { saveAccount } from '@/lib/social/accounts';
import { syncStats } from '@/lib/social/sync';
import { isPlatform, redirectUri, siteUrl, STATE_COOKIE } from '@/lib/social/oauth';
import { PLATFORM_NAME } from '@/lib/social/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest, { params }: { params: { platform: string } }) {
  const site = siteUrl(request.nextUrl.origin);
  const fail = (msg: string) => {
    const res = NextResponse.redirect(`${site}/social?error=${encodeURIComponent(msg)}`);
    res.cookies.delete(STATE_COOKIE);
    return res;
  };

  const { member } = await getSession();
  if (!member || !isAdmin(member)) return fail('Only an admin can connect accounts.');
  if (!isPlatform(params.platform)) return fail('Unknown platform.');

  const q = request.nextUrl.searchParams;
  if (q.get('error')) return fail(q.get('error_description') || q.get('error_reason') || 'Connection was cancelled.');
  const expected = request.cookies.get(STATE_COOKIE)?.value;
  if (!expected || expected !== `${params.platform}:${q.get('state')}`) return fail('The sign-in link expired. Try connecting again.');
  // Instagram appends "#_" to the code; strip anything after it.
  const code = (q.get('code') ?? '').replace(/#_$/, '');
  if (!code) return fail('No authorisation code came back.');

  try {
    const uri = redirectUri(site, params.platform);
    if (params.platform === 'instagram') {
      const a = await igExchangeCode(code, uri);
      await saveAccount({ platform: 'instagram', ...a, connected_by: member.id });
    } else {
      const a = await ttExchangeCode(code, uri);
      const u = await ttUser(a).catch(() => null);
      await saveAccount({ platform: 'tiktok', ...a, username: u?.username ?? u?.display_name ?? null, connected_by: member.id });
    }
  } catch (e) {
    return fail((e as Error).message);
  }

  await syncStats().catch(() => {});
  const res = NextResponse.redirect(`${site}/social?notice=${encodeURIComponent(`${PLATFORM_NAME[params.platform]} connected.`)}`);
  res.cookies.delete(STATE_COOKIE);
  return res;
}
