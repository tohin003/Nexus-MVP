import { Children, useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './MediaCarousel.css';

/** Native swipe/trackpad scrolling, with equivalent visible and keyboard controls. */
export function SnapPager({ children, label, activeIndex, onIndexChange }: { children: ReactNode; label: string; activeIndex?: number; onIndexChange?: (index: number) => void }) {
  const slides = Children.toArray(children);
  const track = useRef<HTMLDivElement>(null);
  const id = useId();
  const [position, setPosition] = useState(0);
  const index = Math.min(activeIndex ?? position, Math.max(0, slides.length - 1));
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function go(next: number) {
    const target = Math.max(0, Math.min(slides.length - 1, next));
    setPosition(target); onIndexChange?.(target);
    const element = track.current;
    if (element) element.scrollTo({ left: target * element.clientWidth, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }
  const align = useEffectEvent((force: boolean) => {
    const element = track.current;
    if (element && (force || Math.round(element.scrollLeft / (element.clientWidth || 1)) !== index)) element.scrollTo({ left: index * element.clientWidth, behavior: 'instant' });
  });
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    align(false);
    const observer = new ResizeObserver(() => align(true));
    observer.observe(element);
    return () => observer.disconnect();
  }, [activeIndex, slides.length]);
  if (!slides.length) return null;
  return <div className="nexus-pager space-y-2" role="region" aria-roledescription="carousel" aria-label={label}>
    <div id={id} ref={track} className="nexus-pager-track nexus-horizontal rounded-2xl" tabIndex={slides.length > 1 ? 0 : undefined} aria-label={`${label}. Use Left and Right arrow keys to browse.`}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        const next = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : null;
        if (next !== null) { event.preventDefault(); go(next); }
      }}
      onScroll={event => {
        const element = event.currentTarget;
        const next = Math.min(slides.length - 1, Math.max(0, Math.round(element.scrollLeft / (element.clientWidth || 1))));
        if (next !== index) { setPosition(next); onIndexChange?.(next); }
      }}>
      {slides.map((slide, i) => <div key={i} className="nexus-pager-slide" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`} inert={i !== index}>{slide}</div>)}
    </div>
    {slides.length > 1 && <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="btn btn-ghost px-3" aria-controls={id} aria-label={`Previous ${label}`} disabled={index === 0} onClick={() => go(index - 1)}><ChevronLeft size={18} /><span className="text-xs">Previous</span></button>
        <span className="text-xs tabular-nums text-[var(--text-2)]" role="status">{index + 1} / {slides.length}</span>
        <button type="button" className="btn btn-ghost px-3" aria-controls={id} aria-label={`Next ${label}`} disabled={index === slides.length - 1} onClick={() => go(index + 1)}><span className="text-xs">Next</span><ChevronRight size={18} /></button>
      </div>
      <div className="nexus-pager-controls" aria-label={`Choose ${label}`}>{slides.map((_, i) => <button key={i} type="button" className="nexus-pager-dot" aria-label={`Go to ${label} ${i + 1}`} aria-current={index === i ? 'true' : undefined} aria-controls={id} onClick={() => go(i)} />)}</div>
    </div>}
  </div>;
}

export function MediaCarousel({ photos, title }: { photos: string[]; title: string }) {
  return <SnapPager label="post photo">{photos.map((photo, i) => <img key={i} src={photo} alt={`Photo ${i + 1} for ${title}`} loading="lazy" className="h-80 max-h-[60dvh] w-full rounded-2xl bg-[var(--surface-2)] object-contain" />)}</SnapPager>;
}
