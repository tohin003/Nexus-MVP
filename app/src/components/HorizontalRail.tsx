import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './MediaCarousel.css';

/** Compact story row: scoped hidden rail with visible, labeled alternatives. */
export function HorizontalRail({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const [edges, setEdges] = useState({ start: true, end: true });
  function measure() { const el = ref.current; if (el) setEdges({ start: el.scrollLeft < 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 }); }
  useEffect(() => { const el = ref.current; if (!el) return; const observer = new ResizeObserver(measure); observer.observe(el); measure(); return () => observer.disconnect(); }, [children]);
  function move(direction: number) {
    const el = ref.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * .8, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  return <div className="min-w-0 space-y-1">
    <div ref={ref} id={id} role="region" aria-label={label} tabIndex={0} className="nexus-horizontal flex min-w-0 gap-3 overflow-x-auto pb-2" onScroll={measure} onKeyDown={event => {
      if (event.target !== event.currentTarget) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); }
    }}>{children}</div>
    {!(edges.start && edges.end) && <div className="flex items-center justify-end gap-1">
      <span className="mr-auto text-xs text-[var(--text-3)]">Swipe or use arrows</span>
      <button type="button" className="btn btn-ghost px-3" aria-label={`Previous ${label}`} aria-controls={id} disabled={edges.start} onClick={() => move(-1)}><ChevronLeft size={18} /></button>
      <button type="button" className="btn btn-ghost px-3" aria-label={`Next ${label}`} aria-controls={id} disabled={edges.end} onClick={() => move(1)}><ChevronRight size={18} /></button>
    </div>}
  </div>;
}
