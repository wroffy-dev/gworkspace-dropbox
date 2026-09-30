'use client';

import * as React from 'react';
import { ImageIcon, Shapes } from 'lucide-react';
import { MediaPicker } from '@/components/admin/media-picker';
import { IconSelect } from './icon-select';
import { cn } from '@/lib/utils/cn';

/**
 * One artwork, from either source.
 *
 * A block that shows a mark wants a picture *or* an icon, never both, so this
 * is one control with two sources rather than two fields that quietly disagree
 * about which one the page will draw. Picking from one source clears the
 * other, which is what makes the answer unambiguous.
 *
 * Both halves are the pickers used everywhere else — the media library with
 * its uploads, and the allow-listed icon set. Nothing new can be pulled into a
 * page through here.
 */
export function MediaOrIcon({
  mediaId,
  icon,
  onChangeMedia,
  onChangeIcon,
  onChange,
  label,
  id,
}: {
  mediaId: string | null;
  icon: string;
  onChangeMedia: (id: string | null) => void;
  onChangeIcon: (name: string) => void;
  /**
   * Both values in one change. A caller that builds its next state from the
   * render it is in — rather than from the latest state — must use this: two
   * separate calls would each start from the same old values, and the second
   * would put back what the first changed, so a chosen image never stuck.
   */
  onChange?: (next: { mediaId: string | null; icon: string }) => void;
  label: string;
  id?: string;
}) {
  /*
   * Which source is showing follows what is set, so reopening the editor lands
   * on the one that is actually being drawn. A block with neither starts on
   * the library, which is what most artwork is.
   */
  const [source, setSource] = React.useState<'media' | 'icon'>(
    !mediaId && icon ? 'icon' : 'media',
  );

  const choose = (next: 'media' | 'icon') => {
    setSource(next);
    // Switching does not clear anything on its own — only picking does, below,
    // so a mistaken tap on the other tab costs nothing.
  };

  return (
    <div className="space-y-2">
      <div
        role="tablist"
        aria-label={`${label} source`}
        className="inline-flex rounded-lg bg-muted/[0.08] p-0.5"
      >
        {(
          [
            ['media', 'Image', ImageIcon],
            ['icon', 'Icon', Shapes],
          ] as const
        ).map(([value, text, Icon]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={source === value}
            onClick={() => choose(value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              source === value
                ? 'bg-surface text-content shadow-sm'
                : 'text-muted hover:text-content',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {text}
          </button>
        ))}
      </div>

      {source === 'media' ? (
        <MediaPicker
          label={label}
          value={mediaId}
          onChange={(next) => {
            // One artwork: choosing a picture puts the icon down.
            if (onChange) return onChange({ mediaId: next, icon: next ? '' : icon });
            onChangeMedia(next);
            if (next) onChangeIcon('');
          }}
        />
      ) : (
        <IconSelect
          id={id}
          value={icon}
          onChange={(next) => {
            if (onChange) return onChange({ mediaId: next ? null : mediaId, icon: next });
            onChangeIcon(next);
            if (next) onChangeMedia(null);
          }}
        />
      )}
    </div>
  );
}
