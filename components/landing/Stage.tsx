'use client';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

/**
 * A tall section whose content stays pinned while you scroll through it.
 * Writes scroll progress (0 → 1) to the CSS variable --p, so the scene animates in CSS
 * with GPU transforms only. No animation library, almost no JavaScript.
 */
export function Stage({ length = 3, id, className = '', children }: { length?: number; id?: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.dataset.reduced = '1';
      el.style.setProperty('--p', '1');
      return;
    }
    let raf = 0;
    let visible = true;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
      el.style.setProperty('--p', p.toFixed(4));
    };
    const onScroll = () => {
      if (visible && !raf) raf = requestAnimationFrame(update);
    };
    // Skip work while the section is off screen.
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) onScroll();
    });
    io.observe(el);
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <section ref={ref} id={id} className={`stage ${className}`} style={{ height: `${length * 100}svh`, '--p': 0 } as CSSProperties}>
      <div className="stage-pin">{children}</div>
    </section>
  );
}
