'use client';

import * as React from 'react';

/**
 * The comparison table's horizontal scroll area, with visible edges.
 *
 * A table wider than the screen scrolls sideways; without a cue, a visitor on
 * a phone sees three columns and never learns there is a fourth. This marks
 * which edges have more beyond them (`data-more-start` / `data-more-end`), and
 * the stylesheet fades those edges and shows a "swipe" hint while there is
 * more to the right. A table that fits shows neither.
 *
 * The region is focusable and labelled so a keyboard user can scroll it with
 * the arrow keys, and a screen reader announces what it is.
 */
export function ComparisonScroller({
  label,
  className,
  children,
}: {
  label: string;
  /** On the scrolling element itself. */
  className?: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [edges, setEdges] = React.useState({ start: false, end: false });

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const max = element.scrollWidth - element.clientWidth;
      const left = Math.abs(element.scrollLeft);
      const next = { start: left > 2, end: max - left > 2 };
      setEdges((current) =>
        current.start === next.start && current.end === next.end ? current : next,
      );
    };
    measure();
    element.addEventListener('scroll', measure, { passive: true });
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    const table = element.firstElementChild;
    if (table) observer?.observe(table);
    return () => {
      element.removeEventListener('scroll', measure);
      observer?.disconnect();
    };
  }, []);

  return (
    <div
      className="cms-ct__frame"
      data-more-start={edges.start ? '' : undefined}
      data-more-end={edges.end ? '' : undefined}
    >
      <div
        ref={ref}
        className={className ? `cms-ct__scroll ${className}` : 'cms-ct__scroll'}
        role="region"
        aria-label={label}
        tabIndex={0}
      >
        {children}
      </div>
      <span className="cms-ct__fade cms-ct__fade--start" aria-hidden="true" />
      <span className="cms-ct__fade cms-ct__fade--end" aria-hidden="true" />
      <p className="cms-ct__hint" aria-hidden="true">
        Swipe to compare <span>→</span>
      </p>
    </div>
  );
}
