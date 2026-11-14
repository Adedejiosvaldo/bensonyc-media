'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession, VIEW_AS, VIEW_AS_COOKIE, type ViewAs } from '@/lib/auth';

/**
 * Admins only: preview the app as a Member, Social team member or Head. It changes what the pages show and
 * offer; the database still knows you're an admin. Choosing "admin" (or anything else) ends the preview.
 */
export async function setViewAs(form: FormData) {
  const { realMember } = await getSession();
  if (realMember?.role !== 'admin') redirect('/home');
  const as = String(form.get('as') ?? '');
  const back = String(form.get('back') ?? '/home');
  const safeBack = back.startsWith('/') && !back.startsWith('//') ? back : '/home';
  if (VIEW_AS.includes(as as ViewAs)) {
    cookies().set(VIEW_AS_COOKIE, as, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 8 });
  } else {
    cookies().delete(VIEW_AS_COOKIE);
  }
  redirect(safeBack);
}
