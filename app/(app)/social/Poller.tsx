'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { advanceSocial } from '@/app/social-actions';

/** While posts are uploading, keep nudging them forward and refresh the page. */
export function Poller({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    let stop = false;
    const tick = async () => {
      if (stop) return;
      try {
        await advanceSocial();
      } catch {
        // keep trying; the daily job also finishes stragglers
      }
      if (!stop) {
        router.refresh();
        setTimeout(tick, 4000);
      }
    };
    const t = setTimeout(tick, 2000);
    return () => {
      stop = true;
      clearTimeout(t);
    };
  }, [active, router]);
  return null;
}
