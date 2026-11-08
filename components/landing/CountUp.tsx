'use client';
import { useEffect, useRef } from 'react';

/** Counts up to `to` the first time it scrolls into view. */
export function CountUp({ to, className = '' }: { to: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = fmt(to);
      return;
    }
    el.textContent = '0';
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const run = (now: number) => {
        const t = Math.min(1, (now - start) / 1600);
        el.textContent = fmt(to * (1 - Math.pow(1 - t, 3)));
        if (t < 1) raf = requestAnimationFrame(run);
      };
      raf = requestAnimationFrame(run);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return <span ref={ref} className={className}>{to.toLocaleString('en-US')}</span>;
}
