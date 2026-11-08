import { NextResponse, type NextRequest } from 'next/server';
import { advanceAll } from '@/lib/social/publish';
import { syncStats } from '@/lib/social/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Daily (vercel.json): finishes any post left half-way, checks whether TikTok drafts were posted,
 * refreshes tokens and pulls the latest follower and post numbers.
 */
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const advanced = await advanceAll(20_000, true);
  const stats = await syncStats();
  return NextResponse.json({ advanced, stats });
}
