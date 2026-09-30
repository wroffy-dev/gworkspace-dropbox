'use client';

import * as React from 'react';
import { Monitor, Smartphone, Tablet, TriangleAlert } from 'lucide-react';
import { getMediaById } from '@/lib/actions/media';
import { parseBlockContent, type ImageWidgetContent } from '@/lib/cms/blocks';
import type { ImageWidgetBreakpoint } from '@/lib/cms/image-widget';
import type { ResolvedMedia } from '@/lib/services/media';
import { cn } from '@/lib/utils/cn';
import { FieldList } from './field-renderer';
import { ImageWidgetFrame } from './blocks/image-widget-frame';
import type { ContentEditorProps } from './content-editors';

const DEVICES: Array<{ id: ImageWidgetBreakpoint; label: string; icon: typeof Monitor }> = [
  { id: 'desktop', label: 'Desktop', icon: Monitor },
  { id: 'tablet', label: 'Tablet', icon: Tablet },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
];

/** The width the preview canvas takes for each device — a stand-in for the page column. */
const CANVAS_WIDTH: Record<ImageWidgetBreakpoint, string> = {
  desktop: '100%',
  tablet: 'min(100%, 30rem)',
  mobile: 'min(100%, 18rem)',
};

/** Groups open when the editor first shows; the rest are a click away. */
const OPEN_GROUPS = ['Image', 'SEO & Accessibility', 'Layout'];

/**
 * The Image section's Content tab: a live preview beside the block's own
 * fields.
 *
 * The fields are the registry's, drawn by the shared field renderer — nothing
 * here decides what can be edited. The preview reads the same unsaved draft the
 * fields write to and draws it with `ImageWidgetFrame`, the component the
 * public page renders, so what is shown is what will be published.
 */
export function ImageWidgetEditor({
  fields,
  values,
  onChange,
  onChangeMany,
  idPrefix,
}: ContentEditorProps) {
  const [device, setDevice] = React.useState<ImageWidgetBreakpoint>('desktop');
  // Parsing applies the schema's defaults and its length checks, so a width
  // half-typed into a field previews exactly as it would be saved.
  const content = React.useMemo(
    () => parseBlockContent<ImageWidgetContent>('imageWidget', values),
    [values],
  );
  const media = useMedia(content.imageId);

  return (
    <div className="cms-iw-editor">
      <div className="cms-iw-editor__layout">
        <div className="cms-iw-editor__preview cms-iw-backdrop rounded-[1.625rem] p-2">
          <section aria-label="Image preview" className="liquid-glass-panel p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-content">Preview</h3>
                <p className="text-xs text-muted">Updates as you edit. Save to publish.</p>
              </div>
              <div
                role="group"
                aria-label="Preview screen size"
                className="flex shrink-0 items-center gap-1 rounded-xl bg-muted/[0.08] p-1"
              >
                {DEVICES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={device === id}
                    title={label}
                    onClick={() => setDevice(id)}
                    className={cn(
                      'inline-flex min-h-[2.25rem] min-w-[2.25rem] items-center justify-center gap-1.5 rounded-lg border border-transparent px-2.5 text-xs font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                      device === id ? 'liquid-tab-active text-content' : 'text-muted hover:text-content',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only sm:not-sr-only">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {media.missing ? (
              <p className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                The chosen image is no longer in the Media Library. Choose another, or visitors will
                see nothing here.
              </p>
            ) : null}

            {/* A stand-in for the page: the section's column at this screen size. */}
            <div className="overflow-hidden rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-hairline sm:p-5">
              <div
                className="mx-auto transition-[width] duration-300 ease-out"
                style={{ width: CANVAS_WIDTH[device] }}
              >
                <ImageWidgetFrame
                  content={content}
                  media={media.value}
                  href={content.linkUrl.trim() || null}
                  device={device}
                />
              </div>
            </div>
          </section>
        </div>

        <FieldList
          fields={fields}
          values={values}
          onChange={onChange}
          onChangeMany={onChangeMany}
          idPrefix={idPrefix}
          collapsibleGroups
          defaultOpenGroups={OPEN_GROUPS}
          layout="container"
        />
      </div>
    </div>
  );
}

/**
 * The chosen image, fetched once per id through the same action the media
 * picker uses. `missing` is true when an id is set but the library no longer
 * has it — deleted since it was chosen.
 */
function useMedia(id: string | null): { value: ResolvedMedia | null; missing: boolean } {
  const [state, setState] = React.useState<{
    id: string | null;
    value: ResolvedMedia | null;
    missing: boolean;
  }>({ id: null, value: null, missing: false });

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getMediaById([id])
      .then((rows) => {
        if (cancelled) return;
        const row = rows[0];
        setState({
          id,
          value: row
            ? { id: row.id, url: row.url, altText: row.altText ?? '', width: row.width, height: row.height }
            : null,
          missing: !row,
        });
      })
      .catch(() => {
        if (!cancelled) setState({ id, value: null, missing: false });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // A stale answer for a previous id is never shown against the current one.
  if (!id || state.id !== id) return { value: null, missing: false };
  return { value: state.value, missing: state.missing };
}
