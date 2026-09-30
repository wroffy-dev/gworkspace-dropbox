import type { ImageWidgetContent } from './blocks';

/**
 * How an Image section is laid out, worked out once for both places that draw
 * one: the public renderer and the section editor's live preview.
 *
 * Everything here is plain data from the block's validated content. Every
 * length has already been through the schema's length check and every other
 * value is one of a fixed set, so nothing an administrator typed reaches a
 * style attribute unchecked.
 */

export const IMAGE_WIDGET_BREAKPOINTS = ['desktop', 'tablet', 'mobile'] as const;
export type ImageWidgetBreakpoint = (typeof IMAGE_WIDGET_BREAKPOINTS)[number];

/** One screen size's frame: how wide the image is and where it sits. */
export type ImageWidgetFrame = {
  width: string;
  maxWidth: string;
  marginLeft: string;
  marginRight: string;
  /** Full width wins over the design panel's image width, as it always has. */
  full: boolean;
};

export type ImageWidgetFrames = Record<ImageWidgetBreakpoint, ImageWidgetFrame>;

const PERCENT: Record<string, string> = {
  '25': '25%',
  '33': '33.333%',
  '50': '50%',
  '66': '66.666%',
  '75': '75%',
  '100': '100%',
};

/**
 * One width choice as a CSS length, or undefined when it cannot be resolved
 * (a Custom width left blank) and the larger screen's should stand.
 *
 * "Auto" is the image's own width; `max-width: 100%` on the frame keeps it from
 * overflowing a narrower screen.
 */
function widthOf(choice: string, custom: string, naturalWidth: number | null | undefined) {
  if (choice === 'custom') return custom || undefined;
  if (choice === 'auto') return naturalWidth ? `${naturalWidth}px` : '100%';
  return PERCENT[choice];
}

const MARGINS: Record<string, [string, string]> = {
  left: ['0px', 'auto'],
  center: ['auto', 'auto'],
  right: ['auto', '0px'],
  full: ['0px', '0px'],
};

/**
 * The frame at each screen size, with inheritance already applied: tablet
 * takes desktop's value unless it has its own, and mobile takes tablet's.
 */
export function imageWidgetFrames(
  content: ImageWidgetContent,
  naturalWidth?: number | null,
): ImageWidgetFrames {
  const desktopAlign = content.alignment;
  const tabletAlign = content.tabletAlignment === 'inherit' ? desktopAlign : content.tabletAlignment;
  const mobileAlign = content.mobileAlignment === 'inherit' ? tabletAlign : content.mobileAlignment;

  const desktopWidth = widthOf(content.width, content.customWidth, naturalWidth) ?? '100%';
  const tabletWidth =
    content.tabletWidth === 'inherit'
      ? desktopWidth
      : (widthOf(content.tabletWidth, content.tabletCustomWidth, naturalWidth) ?? desktopWidth);
  const mobileWidth =
    content.mobileWidth === 'inherit'
      ? tabletWidth
      : (widthOf(content.mobileWidth, content.mobileCustomWidth, naturalWidth) ?? tabletWidth);

  const frame = (align: string, width: string): ImageWidgetFrame => {
    const full = align === 'full';
    const [marginLeft, marginRight] = MARGINS[align] ?? MARGINS.center!;
    return {
      width: full ? '100%' : width,
      maxWidth: full ? '100%' : content.maxWidth || '100%',
      marginLeft,
      marginRight,
      full,
    };
  };

  return {
    desktop: frame(desktopAlign, desktopWidth),
    tablet: frame(tabletAlign, tabletWidth),
    mobile: frame(mobileAlign, mobileWidth),
  };
}

const SUFFIX: Record<ImageWidgetBreakpoint, string> = { desktop: '', tablet: '-t', mobile: '-m' };

/**
 * The frames as the custom properties `.cms-image-widget` reads, one set per
 * screen size, so the media queries in the stylesheet do the switching and the
 * page needs no script and no per-section stylesheet.
 */
export function imageWidgetVars(frames: ImageWidgetFrames): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const breakpoint of IMAGE_WIDGET_BREAKPOINTS) {
    const frame = frames[breakpoint];
    const suffix = SUFFIX[breakpoint];
    vars[`--iw-w${suffix}`] = frame.width;
    vars[`--iw-max${suffix}`] = frame.maxWidth;
    vars[`--iw-ml${suffix}`] = frame.marginLeft;
    vars[`--iw-mr${suffix}`] = frame.marginRight;
    if (frame.full) vars[`--iw-fw${suffix}`] = '100%';
  }
  return vars;
}

/** A width as a `sizes` entry: the slot the browser should pick a file for. */
function sizesEntry(width: string): string {
  const match = /^(\d+(?:\.\d+)?)(px|%|rem|em|vw|vh)$/.exec(width);
  if (!match) return '100vw';
  const amount = Number(match[1]);
  switch (match[2]) {
    case 'px':
      return `${Math.round(amount)}px`;
    case 'rem':
    case 'em':
      return `${Math.round(amount * 16)}px`;
    case '%':
    case 'vw':
      return `${Math.min(100, Math.round(amount))}vw`;
    default:
      return '100vw';
  }
}

/** The `sizes` attribute, so each screen downloads a file near the size it draws. */
export function imageWidgetSizes(frames: ImageWidgetFrames): string {
  return [
    `(max-width: 767px) ${sizesEntry(frames.mobile.width)}`,
    `(max-width: 1023px) ${sizesEntry(frames.tablet.width)}`,
    sizesEntry(frames.desktop.width),
  ].join(', ');
}

/**
 * Corner radii, from the site's own layout tokens so a change on Website design
 * moves these too. Small and XL are derived from them rather than invented.
 */
const RADIUS: Record<string, string | undefined> = {
  none: undefined,
  sm: 'calc(var(--layout-radius, 0.75rem) / 2)',
  md: 'var(--layout-radius, 0.75rem)',
  lg: 'var(--layout-card-radius, 1rem)',
  xl: 'calc(var(--layout-card-radius, 1rem) * 1.5)',
  full: '9999px',
};

export function imageWidgetRadius(content: ImageWidgetContent): string | undefined {
  if (content.borderRadius === 'custom') return content.customRadius || undefined;
  return RADIUS[content.borderRadius];
}

/** The border, as style properties, or none. Colour falls back to the theme's. */
export function imageWidgetBorder(content: ImageWidgetContent): {
  borderWidth?: string;
  borderStyle?: 'solid';
  borderColor?: string;
} {
  if (!content.borderEnabled) return {};
  return {
    borderWidth: content.borderWidth || '1px',
    borderStyle: 'solid',
    borderColor: content.borderColor || 'rgb(var(--brand-border))',
  };
}

/**
 * The shadow classes; the shadows themselves live in the stylesheet. Spelled
 * out in full rather than built from the value, because the stylesheet keeps
 * only the class names it can find written in the source.
 */
const SHADOW_CLASS: Record<string, string> = {
  none: '',
  sm: 'cms-shadow-sm',
  md: 'cms-shadow-md',
  lg: 'cms-shadow-lg',
  xl: 'cms-shadow-xl',
};

export function imageWidgetShadowClass(shadow: string): string {
  return SHADOW_CLASS[shadow] ?? '';
}

/**
 * The alt text the image is drawn with: the section's own, then the Media
 * Library's, then nothing. Never the filename, which is not a description.
 */
export function imageWidgetAlt(
  content: Pick<ImageWidgetContent, 'imageAlt' | 'decorative'>,
  media: { altText?: string | null } | null,
): string {
  if (content.decorative) return '';
  return content.imageAlt.trim() || media?.altText?.trim() || '';
}
