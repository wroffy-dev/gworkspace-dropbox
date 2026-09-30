import type * as React from 'react';
import Link from 'next/link';
import { ImageIcon, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { ImageWidgetContent } from '@/lib/cms/blocks';
import type { ResolvedMedia } from '@/lib/services/media';
import {
  imageWidgetAlt,
  imageWidgetBorder,
  imageWidgetFrames,
  imageWidgetRadius,
  imageWidgetShadowClass,
  imageWidgetSizes,
  imageWidgetVars,
  type ImageWidgetBreakpoint,
} from '@/lib/cms/image-widget';
import { CmsImage } from './cms-image';

const CAPTION_ALIGN: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const PLACEHOLDER_RATIO: Record<string, string> = {
  '1/1': '1 / 1',
  '4/3': '4 / 3',
  '3/2': '3 / 2',
  '16/9': '16 / 9',
  '3/4': '3 / 4',
  '2/3': '2 / 3',
};

/**
 * The Image section's markup, shared by the public page and the editor.
 *
 * On the page the frame reads its per-screen width and alignment from custom
 * properties the stylesheet switches between at the breakpoints. In the editor
 * there is no real screen to query, so `device` picks one frame and applies it
 * directly — which is what lets the preview show tablet and mobile at any
 * window size, from the same numbers the page uses.
 *
 * Kept free of server-only imports so the editor's client preview can render it.
 */
export function ImageWidgetFrame({
  content,
  media,
  href,
  inverted = false,
  device,
}: {
  content: ImageWidgetContent;
  media: ResolvedMedia | null;
  /** Already checked by `safeUrl`; null renders a plain image. */
  href: string | null;
  inverted?: boolean;
  /** Preview mode: draw this screen size's frame, and never navigate. */
  device?: ImageWidgetBreakpoint;
}) {
  const frames = imageWidgetFrames(content, media?.width);
  const radius = imageWidgetRadius(content);
  const caption = content.caption.trim();
  const alt = imageWidgetAlt(content, media);
  const linked = Boolean(href && media);

  const frameStyle: React.CSSProperties = device
    ? {
        width: frames[device].width,
        maxWidth: `min(100%, ${frames[device].maxWidth})`,
        marginLeft: frames[device].marginLeft,
        marginRight: frames[device].marginRight,
      }
    : (imageWidgetVars(frames) as React.CSSProperties);

  const picture =
    !media && device ? (
      <div
        className="flex w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-hairline bg-muted/[0.04] p-6 text-center text-muted"
        style={{
          aspectRatio: PLACEHOLDER_RATIO[content.imageRatio] ?? '4 / 3',
          borderRadius: radius,
        }}
      >
        <ImageIcon className="h-7 w-7 opacity-60" aria-hidden="true" />
        <span className="text-sm font-medium">No image chosen</span>
        <span className="text-xs">Choose one under Image to see it here.</span>
      </div>
    ) : (
      <div
        className={cn('overflow-hidden', imageWidgetShadowClass(content.shadow))}
        style={{ borderRadius: radius, ...imageWidgetBorder(content) }}
      >
        <CmsImage
          media={media}
          alt={content.imageAlt}
          decorative={content.decorative}
          title={content.imageTitle}
          ratio={content.imageRatio}
          fit={content.imageFit}
          position={content.imagePosition}
          width="100%"
          sizes={imageWidgetSizes(frames)}
          placeholder
        />
      </div>
    );

  // The editor never navigates away from unsaved work, so its preview shows
  // that the image is linked instead of linking it.
  const body =
    linked && !device ? (
      <Link
        href={href!}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        style={{ borderRadius: radius }}
        // A link needs a name, and an image with no alt text gives it none.
        aria-label={alt ? undefined : content.imageTitle.trim() || caption || undefined}
        {...(content.openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {picture}
      </Link>
    ) : (
      picture
    );

  const linkNote =
    device && href ? (
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
        <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">
          Links to {href}
          {content.openInNewTab ? ' (new tab)' : ''}
        </span>
      </p>
    ) : null;

  const frameClass = device ? undefined : 'cms-image-widget';

  if (!caption) {
    return (
      <div className={frameClass} style={frameStyle}>
        {body}
        {linkNote}
      </div>
    );
  }

  return (
    <figure className={frameClass} style={frameStyle}>
      {body}
      <figcaption
        className={cn(
          'mt-3 text-sm leading-relaxed',
          inverted ? 'text-white/75' : 'text-muted',
          CAPTION_ALIGN[content.captionAlign],
        )}
      >
        {caption}
      </figcaption>
      {linkNote}
    </figure>
  );
}
