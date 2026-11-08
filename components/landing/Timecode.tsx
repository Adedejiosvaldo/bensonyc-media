'use client';
import { useEffect, useRef } from 'react';

/** Camera timecode that runs with the scroll position of the surrounding stage. */
export function Timecode({ seconds = 7200 }: { seconds?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    const stage = el?.closest<HTMLElement>('.stage');
    if (!el || !stage) return;
    let raf = 0;
    const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');
    const tick = () => {
      const p = Number(stage.style.getPropertyValue('--p')) || 0;
      const s = p * seconds;
      const text = `${pad(s / 3600)}:${pad((s / 60) % 60)}:${pad(s % 60)}:${pad((s * 25) % 25)}`;
      if (el.textContent !== text) el.textContent = text;
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf);
      if (e.isIntersecting) raf = requestAnimationFrame(tick);
    });
    io.observe(stage);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [seconds]);
  return <span ref={ref}>00:00:00:00</span>;
}
