'use client';

import * as React from 'react';
import type { InlineScript } from '@/lib/cms/custom-html';

/**
 * Runs an inline custom code section's scripts once it is on the page.
 *
 * The markup was rendered on the server; the scripts were lifted out of it
 * (see `extractScripts`) so they run exactly once, in order — an external
 * script finishes loading before the next one runs, the way they would in a
 * hand-written page — and run again after client-side navigation, which
 * scripts written into server HTML would not.
 */
export function CustomHtmlScripts({
  scripts,
  js,
  targetId,
}: {
  scripts: InlineScript[];
  js: string;
  /** The section's element, which the scripts are appended to. */
  targetId: string;
}) {
  const ran = React.useRef(false);

  React.useEffect(() => {
    // React's development double-run must not run someone's code twice.
    if (ran.current) return;
    ran.current = true;
    const target = document.getElementById(targetId);
    if (!target) return;

    const queue: InlineScript[] = [
      ...scripts,
      ...(js.trim() ? [{ src: '', code: js, type: '', async: false, defer: false }] : []),
    ];
    const added: HTMLScriptElement[] = [];
    let cancelled = false;

    const run = (index: number) => {
      if (cancelled || index >= queue.length) return;
      const item = queue[index]!;
      const element = document.createElement('script');
      if (item.type) element.type = item.type;
      if (item.src) {
        element.src = item.src;
        element.async = item.async;
        if (!item.async) {
          element.onload = () => run(index + 1);
          element.onerror = () => run(index + 1);
          target.appendChild(element);
          added.push(element);
          return;
        }
      } else {
        element.text = item.code;
      }
      target.appendChild(element);
      added.push(element);
      run(index + 1);
    };
    run(0);

    return () => {
      cancelled = true;
      for (const element of added) element.remove();
    };
  }, [scripts, js, targetId]);

  return null;
}
