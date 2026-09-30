import NextImage from 'next/image';
import { cn } from '@/lib/utils/cn';
import type { ResolvedMedia } from '@/lib/services/media';

/**
 * The CMS's one way to draw an admin-chosen image.
 *
 * Free of server-only imports, so the same component renders on the public site
 * and in the section editor's live preview.
 */

const RATIO_STYLE: Record<string, string | undefined> = {
  auto: undefined,
  '1/1': '1 / 1',
  '4/3': '4 / 3',
  '3/2': '3 / 2',
  '16/9': '16 / 9',
  '3/4': '3 / 4',
  '2/3': '2 / 3',
};

export type CmsImageProps = {
  media: ResolvedMedia | null;
  alt?: string;
  ratio?: string;
  fit?: string;
  position?: string;
  width?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  wrapperClassName?: string;
  /** Renders a dashed placeholder when no image is chosen. */
  placeholder?: boolean;
  /** Draws an empty alt on purpose, skipping the library's alt text. */
  decorative?: boolean;
  /** Optional `title` attribute, shown as a tooltip. */
  title?: string;
};

/**
 * Admin-configured image.
 *
 * Ratio, fit, focal point and width all come from the section's content, and the
 * responsive width/height set in the design panel arrive as `--sec-img-*`.
 */
export function CmsImage({
  media,
  alt,
  ratio = 'auto',
  fit = 'cover',
  position = 'center',
  width,
  sizes = '(max-width: 1024px) 100vw, 50vw',
  priority = false,
  className,
  wrapperClassName,
  placeholder = false,
  decorative = false,
  title,
}: CmsImageProps) {
  const aspect = RATIO_STYLE[ratio];

  if (!media) {
    if (!placeholder) return null;
    return (
      <div
        className={cn(
          'w-full rounded-2xl border border-dashed border-hairline bg-muted/5',
          wrapperClassName,
        )}
        style={{ aspectRatio: aspect ?? '4 / 3', width: width || undefined }}
        aria-hidden="true"
      />
    );
  }

  const objectFit = ['cover', 'contain', 'fill', 'none'].includes(fit) ? fit : 'cover';

  return (
    <div
      className={cn('cms-media relative overflow-hidden', wrapperClassName)}
      style={{ aspectRatio: aspect, width: width || undefined }}
    >
      <NextImage
        src={media.url}
        alt={decorative ? '' : alt?.trim() || media.altText || ''}
        title={title?.trim() || undefined}
        {...(aspect ? { fill: true } : { width: media.width ?? 1200, height: media.height ?? 800 })}
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        className={cn(aspect ? 'absolute inset-0 h-full w-full' : 'h-auto w-full', className)}
        style={{ objectFit: objectFit as 'cover', objectPosition: position }}
      />
    </div>
  );
}

