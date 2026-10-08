'use client';

import * as React from 'react';
import {
  CUSTOM_HTML_HEIGHT_MESSAGE,
  CUSTOM_HTML_MEASURE_MESSAGE,
  CUSTOM_HTML_SANDBOX,
} from '@/lib/cms/custom-html';

/**
 * A custom code section, isolated: its own document in a sandboxed frame.
 *
 * The frame has an opaque origin (`allow-scripts` without
 * `allow-same-origin`), so its code cannot read this site's cookies, storage
 * or DOM, nor call it as a signed-in user. It reports its height by
 * `postMessage`; only messages from this frame's own window are believed,
 * and the height is clamped, so nothing else on the page can resize it.
 */
export function CustomHtmlFrame({
  srcDoc,
  title,
  height,
  fixedHeight,
  lazy,
  className,
}: {
  srcDoc: string;
  title: string;
  height: 'auto' | 'fixed';
  fixedHeight: string;
  lazy: boolean;
  className?: string;
}) {
  const ref = React.useRef<HTMLIFrameElement>(null);
  const [measured, setMeasured] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (height !== 'auto') return;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== ref.current?.contentWindow) return;
      const data = event.data as { type?: unknown; height?: unknown } | null;
      if (!data || data.type !== CUSTOM_HTML_HEIGHT_MESSAGE || typeof data.height !== 'number') return;
      setMeasured(Math.min(Math.max(Math.round(data.height), 0), 20_000));
    };
    window.addEventListener('message', onMessage);
    // The frame may have loaded and reported before this listener existed.
    ref.current?.contentWindow?.postMessage({ type: CUSTOM_HTML_MEASURE_MESSAGE }, '*');
    return () => window.removeEventListener('message', onMessage);
  }, [height]);

  // A frame that loads later (lazily, or after its code changes) reports by
  // itself; asking on load as well covers a report sent mid-navigation.
  const ask = () => ref.current?.contentWindow?.postMessage({ type: CUSTOM_HTML_MEASURE_MESSAGE }, '*');

  const style: React.CSSProperties =
    height === 'fixed'
      ? { height: fixedHeight || '480px' }
      : // Until the frame reports, a modest height rather than none, so the
        // page does not jump from nothing to everything.
        { height: measured === null ? '150px' : `${measured}px` };

  return (
    <iframe
      ref={ref}
      title={title || 'Embedded content'}
      srcDoc={srcDoc}
      sandbox={CUSTOM_HTML_SANDBOX}
      loading={lazy ? 'lazy' : 'eager'}
      referrerPolicy="strict-origin-when-cross-origin"
      onLoad={height === 'auto' ? ask : undefined}
      className={className ?? 'cms-custom-code__frame'}
      style={style}
    />
  );
}
