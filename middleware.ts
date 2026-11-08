import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Serve the church page as the homepage of its own domain, e.g. CHURCH_HOST=bensonyc.org
  const churchHost = process.env.CHURCH_HOST;
  if (churchHost && request.nextUrl.hostname === churchHost && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/church';
    return NextResponse.rewrite(url);
  }
  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|logo.png|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)'],
};
