import type * as React from 'react';
import Link from 'next/link';
import type {
  ImageCardsContent,
  IconCardsContent,
  ImageBoxContent,
  ImageWidgetContent,
  IconBoxContent,
  ListSectionContent,
  HeadingTextContent,
  TextListImageContent,
  StatisticsContent,
} from '@/lib/cms/blocks';
import { getMedia, getMediaByIds } from '@/lib/services/media';
import { resolveCmsIcon } from '@/components/ui/icons';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { safeUrl } from '@/lib/utils/sanitize';
import {
  SectionHeading,
  CtaLink,
  mainCtaVariant,
  RichText,
  CmsImage,
  IconBadge,
  MaybeLink,
  blockColumnVars,
  type BlockContext,
} from './shared';

/** Card chrome shared by the image and icon card grids. */
function cardShell(style: string, inverted: boolean): string {
  if (style === 'plain') return '';
  return inverted
    ? 'bg-white/10 backdrop-blur rounded-[var(--layout-card-radius)]'
    : 'border border-hairline bg-surface shadow-sm transition-shadow hover:shadow-md rounded-[var(--layout-card-radius)]';
}

export async function ImageCardsBlock({
  content,
  ctx,
}: {
  content: ImageCardsContent;
  ctx: BlockContext;
}) {
  const all = content.items.filter((item) => item.imageId || item.heading || item.description);
  const columns = content.columns || 3;
  // "Maximum rows" is a friendlier way of saying "cap the list" for an admin.
  const items = content.maxRows > 0 ? all.slice(0, content.maxRows * columns) : all;
  const media = await getMediaByIds(items.map((i) => i.imageId).filter((id): id is string => Boolean(id)));

  return (
    <>
      <SectionHeading
        eyebrow={content.eyebrow}
        heading={content.heading}
        description={content.description}
        inverted={ctx.inverted}
        className={content.heading || content.description ? 'mb-10' : undefined}
      />

      {items.length === 0 ? (
        <EmptyBlockHint inverted={ctx.inverted} message="Add a card to this section to see it here." />
      ) : (
        <ul className="cms-grid list-none" style={blockColumnVars(ctx.design, content)}>
          {items.map((item, index) => {
            const image = item.imageId ? (media.get(item.imageId) ?? null) : null;
            const overlay = content.cardStyle === 'overlay' && image;

            return (
              <li key={index}>
                <MaybeLink
                  url={item.linkUrl}
                  className={cn(
                    'group block h-full overflow-hidden',
                    overlay ? 'relative rounded-[var(--layout-card-radius)]' : cardShell(content.cardStyle, ctx.inverted),
                    content.cardAlign === 'center' && 'text-center',
                  )}
                >
                  <CmsImage
                    media={image}
                    alt={item.imageAlt}
                    ratio={content.imageRatio === 'auto' ? '4/3' : content.imageRatio}
                    fit={content.imageFit}
                    sizes={`(max-width: 767px) 100vw, (max-width: 1023px) 50vw, ${Math.round(100 / columns)}vw`}
                    wrapperClassName={overlay ? 'h-full min-h-[18rem]' : undefined}
                    placeholder={!overlay}
                  />

                  <div
                    className={cn(
                      overlay
                        ? 'absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/25 to-transparent p-5 text-white'
                        : content.cardStyle === 'plain'
                          ? 'pt-4'
                          : 'p-5',
                    )}
                  >
                    {item.heading ? (
                      <h3
                        className={cn(
                          'font-heading text-base font-semibold',
                          overlay ? 'text-white' : ctx.inverted ? 'text-white' : 'text-content',
                        )}
                      >
                        {item.heading}
                      </h3>
                    ) : null}
                    {item.description ? (
                      <p
                        className={cn(
                          'mt-2 text-sm leading-relaxed',
                          overlay ? 'text-white/85' : ctx.inverted ? 'text-white/75' : 'text-muted',
                        )}
                      >
                        {item.description}
                      </p>
                    ) : null}
                    {item.ctaLabel && !item.linkUrl ? (
                      <div className={cn('cms-actions mt-4', content.cardAlign === 'center' && 'flex justify-center')}>
                        <CtaLink label={item.ctaLabel} url={item.ctaUrl} variant="outline" size="sm" />
                      </div>
                    ) : item.ctaLabel ? (
                      <span className="mt-4 inline-flex text-sm font-medium cms-accent group-hover:underline">
                        {item.ctaLabel}
                      </span>
                    ) : null}
                  </div>
                </MaybeLink>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export async function IconCardsBlock({
  content,
  ctx,
}: {
  content: IconCardsContent;
  ctx: BlockContext;
}) {
  const items = content.items.filter((item) => item.heading || item.description || item.icon);
  const columns = content.columns || 3;
  const media = await getMediaByIds(items.map((i) => i.imageId).filter((id): id is string => Boolean(id)));
  const iconSize = content.iconSize || undefined;

  return (
    <>
      <SectionHeading
        eyebrow={content.eyebrow}
        heading={content.heading}
        description={content.description}
        inverted={ctx.inverted}
        className={content.heading || content.description ? 'mb-10' : undefined}
      />

      {items.length === 0 ? (
        <EmptyBlockHint inverted={ctx.inverted} message="Add a card to this section to see it here." />
      ) : (
        <ul className="cms-grid list-none" style={blockColumnVars(ctx.design, content)}>
          {items.map((item, index) => {
            const Icon = resolveCmsIcon(item.icon);
            const image = item.imageId ? media.get(item.imageId) : null;
            const beside = content.iconPosition === 'left';

            const glyph =
              image || Icon ? (
                <IconBadge style={content.iconStyle} size={iconSize} inverted={ctx.inverted}>
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image.url} alt="" aria-hidden="true" className="h-[60%] w-[60%] object-contain" />
                  ) : Icon ? (
                    <Icon className="h-[55%] w-[55%]" aria-hidden="true" />
                  ) : null}
                </IconBadge>
              ) : null;

            return (
              <li key={index}>
                <MaybeLink
                  url={item.linkUrl}
                  className={cn(
                    'group block h-full',
                    content.cardStyle === 'card' ? cn(cardShell('card', ctx.inverted), 'p-6') : '',
                    beside ? 'flex items-start gap-4' : '',
                    !beside && content.cardAlign === 'center' && 'text-center',
                    !beside && content.cardAlign === 'center' && content.cardStyle !== 'card' && 'flex flex-col items-center',
                  )}
                >
                  {glyph ? (
                    <span className={cn(!beside && 'mb-4 block', !beside && content.cardAlign === 'center' && 'mx-auto')}>
                      {glyph}
                    </span>
                  ) : null}

                  <div className="min-w-0">
                    {item.heading ? (
                      <h3
                        className={cn(
                          'font-heading text-base font-semibold',
                          ctx.inverted ? 'text-white' : 'text-content',
                        )}
                      >
                        {item.heading}
                      </h3>
                    ) : null}
                    {item.description ? (
                      <p
                        className={cn(
                          'mt-2 text-sm leading-relaxed',
                          ctx.inverted ? 'text-white/75' : 'text-muted',
                        )}
                      >
                        {item.description}
                      </p>
                    ) : null}
                    {item.ctaLabel && !item.linkUrl ? (
                      <div className={cn('cms-actions mt-4', !beside && content.cardAlign === 'center' && 'flex justify-center')}>
                        <CtaLink label={item.ctaLabel} url={item.ctaUrl} variant="outline" size="sm" />
                      </div>
                    ) : item.ctaLabel ? (
                      <span className="mt-3 inline-flex text-sm font-medium cms-accent group-hover:underline">
                        {item.ctaLabel}
                      </span>
                    ) : null}
                  </div>
                </MaybeLink>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export async function ImageBoxBlock({ content, ctx }: { content: ImageBoxContent; ctx: BlockContext }) {
  const image = await getMedia(content.imageId);
  const side = content.layout === 'imageLeft' || content.layout === 'imageRight';

  const copy = (
    <div>
      <SectionHeading
        eyebrow={content.eyebrow}
        heading={content.heading}
        align={content.layout === 'imageTop' ? 'center' : 'left'}
        inverted={ctx.inverted || content.layout === 'backgroundImage'}
      />
      <RichText
        html={content.text}
        className={cn('mt-5', (ctx.inverted || content.layout === 'backgroundImage') && 'text-white/85')}
      />
      {content.ctaLabel ? (
        <div className="cms-actions mt-7">
          <CtaLink
            label={content.ctaLabel}
            url={content.ctaUrl}
            role="primary"
            variant={mainCtaVariant(ctx, ctx.inverted || content.layout === 'backgroundImage')}
            size="md"
          />
        </div>
      ) : null}
    </div>
  );

  if (content.layout === 'backgroundImage') {
    return (
      <div className="relative isolate overflow-hidden rounded-[var(--layout-card-radius)] px-6 py-16 sm:px-12">
        {image ? (
          // A plain <img> keeps this a pure background layer with no layout impact.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-10 h-full w-full"
            style={{ objectFit: content.imageFit as 'cover', objectPosition: content.imagePosition }}
          />
        ) : null}
        <div className="absolute inset-0 -z-10 bg-black/50" aria-hidden="true" />
        <div className="cms-measure mx-auto max-w-2xl text-center text-white">{copy}</div>
      </div>
    );
  }

  const picture = (
    <CmsImage
      media={image}
      alt={content.imageAlt}
      ratio={content.imageRatio}
      fit={content.imageFit}
      position={content.imagePosition}
      width={content.imageWidth || undefined}
      wrapperClassName="rounded-[var(--layout-card-radius)] border border-hairline shadow-lg"
      placeholder
    />
  );

  if (content.layout === 'imageTop') {
    return (
      <div className="cms-measure mx-auto max-w-3xl">
        <div className="mb-8">{picture}</div>
        {copy}
      </div>
    );
  }

  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={cn(content.layout === 'imageLeft' && 'lg:order-2')}>{copy}</div>
      <div className={cn(content.layout === 'imageLeft' && 'lg:order-1')}>{picture}</div>
    </div>
  );
}

const WIDGET_PERCENT: Record<string, string> = {
  '25': '25%',
  '33': '33.333%',
  '50': '50%',
  '66': '66.666%',
  '75': '75%',
  '100': '100%',
};

const WIDGET_RADIUS: Record<string, string | undefined> = {
  none: undefined,
  sm: '0.375rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  full: '9999px',
};

const WIDGET_SHADOW: Record<string, string> = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
};

/**
 * One breakpoint's width choice as a CSS length, or undefined to inherit.
 *
 * Every value is either a fixed percentage or a length the schema has already
 * normalised, so nothing an administrator types reaches the style attribute
 * unchecked. "Auto" is the image's own width; the frame's `max-width: 100%`
 * keeps it from overflowing a narrower screen.
 */
function widgetWidth(choice: string, custom: string, naturalWidth: number | null | undefined) {
  if (choice === 'custom') return custom || undefined;
  if (choice === 'auto') return naturalWidth ? `${naturalWidth}px` : '100%';
  return WIDGET_PERCENT[choice];
}

/** A width as a `sizes` entry: the slot the browser should pick a file for. */
function sizesEntry(width: string | undefined): string {
  if (!width) return '100vw';
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

/**
 * A single, fully configurable image.
 *
 * The frame is sized by the content's per-screen widths, written as custom
 * properties the `.cms-image-widget` rule reads; the design panel's own
 * responsive Image width, when set, overrides them the way its column counts
 * override a block's. The image inside fills the frame, keeping its intrinsic
 * ratio unless one is chosen.
 */
export async function ImageWidgetBlock({
  content,
  ctx,
}: {
  content: ImageWidgetContent;
  ctx: BlockContext;
}) {
  const image = await getMedia(content.imageId);
  // No image — never chosen, or since deleted from the library. An editor sees
  // an empty slot to fill; a visitor sees nothing rather than a broken frame.
  if (!image && !ctx.preview) return null;
  const full = content.alignment === 'full';

  const desktop = full ? '100%' : widgetWidth(content.width, content.customWidth, image?.width);
  const tablet = full
    ? undefined
    : content.tabletWidth === 'inherit'
      ? undefined
      : widgetWidth(content.tabletWidth, content.tabletCustomWidth, image?.width);
  const mobile = full
    ? undefined
    : content.mobileWidth === 'inherit'
      ? undefined
      : widgetWidth(content.mobileWidth, content.mobileCustomWidth, image?.width);

  const vars: Record<string, string> = {};
  if (desktop) vars['--iw-w'] = desktop;
  if (tablet) vars['--iw-w-tablet'] = tablet;
  if (mobile) vars['--iw-w-mobile'] = mobile;
  if (content.maxWidth && !full) vars['--iw-max-w'] = content.maxWidth;

  const tabletSlot = tablet ?? desktop;
  const sizes = [
    `(max-width: 767px) ${sizesEntry(mobile ?? tabletSlot)}`,
    `(max-width: 1023px) ${sizesEntry(tabletSlot)}`,
    sizesEntry(desktop),
  ].join(', ');

  const radius =
    content.borderRadius === 'custom'
      ? content.customRadius || undefined
      : WIDGET_RADIUS[content.borderRadius];

  const alt = content.decorative ? '' : content.altText.trim() || image?.altText?.trim() || '';
  const href = image ? safeUrl(content.linkUrl) : null;
  const caption = content.caption.trim();

  const picture = (
    <div
      className={cn(
        'overflow-hidden',
        WIDGET_SHADOW[content.shadow],
        content.borderEnabled && 'border-solid border-hairline',
      )}
      style={{
        borderRadius: radius,
        borderWidth: content.borderEnabled ? content.borderWidth || '1px' : undefined,
        borderColor: content.borderEnabled ? content.borderColor || undefined : undefined,
      }}
    >
      <CmsImage
        media={image}
        alt={content.altText}
        decorative={content.decorative}
        title={content.imageTitle}
        ratio={content.imageRatio}
        fit={content.imageFit}
        position={content.imagePosition}
        width="100%"
        sizes={sizes}
        placeholder
      />
    </div>
  );

  const linked = href ? (
    <Link
      href={href}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      style={{ borderRadius: radius }}
      // A link needs a name: an image with no alt gives it none.
      aria-label={alt ? undefined : content.imageTitle.trim() || caption || undefined}
      {...(content.openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {picture}
    </Link>
  ) : (
    picture
  );

  const frameClass = cn(
    'cms-image-widget',
    full && 'cms-image-widget--full',
    !full && content.alignment === 'left' && 'mr-auto',
    !full && content.alignment === 'right' && 'ml-auto',
    !full && content.alignment === 'center' && 'mx-auto',
  );

  if (!caption) {
    return (
      <div className={frameClass} style={vars as React.CSSProperties}>
        {linked}
      </div>
    );
  }

  return (
    <figure className={frameClass} style={vars as React.CSSProperties}>
      {linked}
      <figcaption
        className={cn(
          'mt-3 text-sm leading-relaxed',
          ctx.inverted ? 'text-white/75' : 'text-muted',
          content.captionAlign === 'left' && 'text-left',
          content.captionAlign === 'center' && 'text-center',
          content.captionAlign === 'right' && 'text-right',
        )}
      >
        {caption}
      </figcaption>
    </figure>
  );
}

export async function IconBoxBlock({ content, ctx }: { content: IconBoxContent; ctx: BlockContext }) {
  const image = await getMedia(content.imageId);
  const Icon = resolveCmsIcon(content.icon);
  const centred = content.iconAlign === 'center';

  return (
    <MaybeLink
      url={content.linkUrl}
      className={cn('group block', centred && 'cms-measure mx-auto max-w-2xl text-center')}
    >
      {image || Icon ? (
        <IconBadge
          style={content.iconStyle}
          size={content.iconSize || '3.5rem'}
          inverted={ctx.inverted}
          className={cn('mb-5', centred && 'mx-auto')}
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image.url} alt="" aria-hidden="true" className="h-[60%] w-[60%] object-contain" />
          ) : Icon ? (
            <Icon className="h-[55%] w-[55%]" aria-hidden="true" />
          ) : null}
        </IconBadge>
      ) : null}

      {content.heading ? (
        <h3
          className={cn(
            'font-heading text-xl font-semibold sm:text-2xl',
            ctx.inverted ? 'text-white' : 'text-content',
          )}
        >
          {content.heading}
        </h3>
      ) : null}
      {content.description ? (
        <p className={cn('mt-3 leading-relaxed', ctx.inverted ? 'text-white/80' : 'text-muted')}>
          {content.description}
        </p>
      ) : null}
      {content.ctaLabel && !content.linkUrl ? (
        <div className={cn('cms-actions mt-6', centred && 'flex justify-center')}>
          <CtaLink
            label={content.ctaLabel}
            url={content.ctaUrl}
            role="primary"
            variant={mainCtaVariant(ctx)}
            size="md"
          />
        </div>
      ) : null}
    </MaybeLink>
  );
}

/** Bullet marker shared by the list and text+list blocks. */
function Marker({
  marker,
  index,
  icon,
  inverted,
}: {
  marker: string;
  index: number;
  icon?: string;
  inverted: boolean;
}) {
  if (marker === 'none') return null;

  const tone = inverted ? 'bg-white/20 text-white' : 'bg-brand/10 cms-accent';

  if (marker === 'number') {
    return (
      <span
        className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold', tone)}
        aria-hidden="true"
      >
        {index + 1}
      </span>
    );
  }

  if (marker === 'bullet') {
    return (
      <span
        className={cn('mt-2 h-1.5 w-1.5 shrink-0 rounded-full', inverted ? 'bg-white/60' : 'bg-brand')}
        aria-hidden="true"
      />
    );
  }

  const Icon = marker === 'icon' ? resolveCmsIcon(icon) : null;
  const Glyph = Icon ?? Check;

  return (
    <span
      className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full', tone)}
      aria-hidden="true"
    >
      <Glyph className="h-3 w-3" />
    </span>
  );
}

export function ListSectionBlock({ content, ctx }: { content: ListSectionContent; ctx: BlockContext }) {
  const items = content.items.filter((item) => item.text || item.description);

  return (
    <>
      <SectionHeading
        eyebrow={content.eyebrow}
        heading={content.heading}
        description={content.description}
        inverted={ctx.inverted}
        className={content.heading || content.description ? 'mb-10' : undefined}
      />

      {items.length === 0 ? (
        <EmptyBlockHint inverted={ctx.inverted} message="Add list items to this section to see them here." />
      ) : (
        <ul className="cms-grid list-none" style={blockColumnVars(ctx.design, content, 1)}>
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-3">
              <Marker marker={content.marker} index={index} icon={item.icon} inverted={ctx.inverted} />
              <div className="min-w-0">
                {item.url ? (
                  <MaybeLink
                    url={item.url}
                    className={cn(
                      'font-medium underline-offset-4 hover:underline',
                      ctx.inverted ? 'text-white' : 'text-content',
                    )}
                  >
                    {item.text}
                  </MaybeLink>
                ) : (
                  <span className={cn('font-medium', ctx.inverted ? 'text-white' : 'text-content')}>
                    {item.text}
                  </span>
                )}
                {item.description ? (
                  <p className={cn('mt-1 text-sm leading-relaxed', ctx.inverted ? 'text-white/70' : 'text-muted')}>
                    {item.description}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function HeadingTextBlock({ content, ctx }: { content: HeadingTextContent; ctx: BlockContext }) {
  const centred = content.align === 'center';
  return (
    <div className={cn('cms-measure', centred ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl')}>
      <SectionHeading
        as={ctx.isFirst ? 'h1' : 'h2'}
        eyebrow={content.eyebrow}
        heading={content.heading}
        description={content.subheading}
        align={centred ? 'center' : 'left'}
        inverted={ctx.inverted}
        className={centred ? undefined : 'cms-measure max-w-3xl'}
      />
      <RichText html={content.content} className={cn('mt-6', ctx.inverted && 'text-white/80')} />
      {content.ctaLabel ? (
        <div className={cn('cms-actions mt-8 flex flex-wrap gap-3', centred && 'justify-center')}>
          <CtaLink
            label={content.ctaLabel}
            url={content.ctaUrl}
            role="primary"
            variant={mainCtaVariant(ctx)}
            size="md"
          />
        </div>
      ) : null}
    </div>
  );
}

export async function TextListImageBlock({
  content,
  ctx,
}: {
  content: TextListImageContent;
  ctx: BlockContext;
}) {
  const image = await getMedia(content.imageId);
  const items = content.items.filter((item) => item.text);
  const stacked = content.imagePlacement === 'top' || content.imagePlacement === 'bottom';

  const copy = (
    <div>
      <SectionHeading
        as={ctx.isFirst ? 'h1' : 'h2'}
        eyebrow={content.eyebrow}
        heading={content.heading}
        description={content.subheading}
        align="left"
        inverted={ctx.inverted}
      />
      <RichText html={content.description} className={cn('mt-5', ctx.inverted && 'text-white/80')} />

      {items.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-3">
              <Marker marker={content.marker} index={index} icon={item.icon} inverted={ctx.inverted} />
              <span className={cn('text-sm leading-relaxed', ctx.inverted ? 'text-white/80' : 'text-muted')}>
                {item.text}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {content.primaryCtaLabel || content.secondaryCtaLabel ? (
        <div className="cms-actions mt-8 flex flex-wrap gap-3">
          <CtaLink
            label={content.primaryCtaLabel}
            url={content.primaryCtaUrl}
            role="primary"
            variant={mainCtaVariant(ctx)}
            size="md"
          />
          <CtaLink
            label={content.secondaryCtaLabel}
            url={content.secondaryCtaUrl}
            variant={ctx.inverted ? 'ghost' : 'outline'}
            size="md"
          />
        </div>
      ) : null}
    </div>
  );

  const picture = (
    <CmsImage
      media={image}
      alt={content.imageAlt}
      ratio={content.imageRatio}
      fit={content.imageFit}
      sizes={stacked ? '100vw' : '(max-width: 1023px) 100vw, 50vw'}
      wrapperClassName="rounded-[var(--layout-card-radius)] border border-hairline shadow-lg"
      placeholder
    />
  );

  if (stacked) {
    return (
      <div className="cms-measure mx-auto max-w-3xl">
        {content.imagePlacement === 'top' ? <div className="mb-10">{picture}</div> : null}
        {copy}
        {content.imagePlacement === 'bottom' ? <div className="mt-10">{picture}</div> : null}
      </div>
    );
  }

  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={cn(content.imagePlacement === 'left' && 'lg:order-2')}>{copy}</div>
      <div className={cn(content.imagePlacement === 'left' && 'lg:order-1')}>{picture}</div>
    </div>
  );
}

export function StatisticsBlock({ content, ctx }: { content: StatisticsContent; ctx: BlockContext }) {
  const items = content.items.filter((item) => item.value || item.label);
  const centred = content.align === 'center';

  return (
    <>
      <SectionHeading
        eyebrow={content.eyebrow}
        heading={content.heading}
        description={content.description}
        align={centred ? 'center' : 'left'}
        inverted={ctx.inverted}
        className={content.heading || content.description ? 'mb-10' : undefined}
      />

      {items.length === 0 ? (
        <EmptyBlockHint inverted={ctx.inverted} message="Add a statistic to this section to see it here." />
      ) : (
        <dl
          className={cn('cms-grid', centred && 'text-center', content.style === 'divided' && 'gap-y-8')}
          style={blockColumnVars(ctx.design, content, 4)}
        >
          {items.map((item, index) => {
            const Icon = resolveCmsIcon(item.icon);
            return (
              <div
                key={index}
                className={cn(
                  content.style === 'card' &&
                    cn('p-5 rounded-[var(--layout-card-radius)]', ctx.inverted ? 'bg-white/10' : 'bg-muted/[0.05]'),
                  content.style === 'divided' &&
                    'border-l border-hairline pl-5 first:border-l-0 first:pl-0',
                )}
              >
                {Icon ? (
                  <IconBadge style="circle" size="2.25rem" inverted={ctx.inverted} className={cn('mb-3', centred && 'mx-auto')}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </IconBadge>
                ) : null}
                <dt className="sr-only">{item.label || item.value}</dt>
                <dd>
                  <span
                    className={cn(
                      'block font-heading text-3xl font-bold tabular-nums sm:text-4xl',
                      ctx.inverted ? 'text-white' : 'cms-accent',
                    )}
                  >
                    {item.prefix}
                    {item.value}
                    {item.suffix}
                  </span>
                  {item.label ? (
                    <span
                      className={cn(
                        'mt-1.5 block text-sm font-medium',
                        ctx.inverted ? 'text-white/85' : 'text-content',
                      )}
                    >
                      {item.label}
                    </span>
                  ) : null}
                  {item.description ? (
                    <span
                      className={cn('mt-1 block text-xs leading-relaxed', ctx.inverted ? 'text-white/65' : 'text-muted')}
                    >
                      {item.description}
                    </span>
                  ) : null}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </>
  );
}

/**
 * Shown in place of an empty repeater.
 *
 * A brand-new section is empty by definition, and a silently blank band on the
 * live site is worse than one line telling the admin what to do next.
 */
function EmptyBlockHint({ message, inverted }: { message: string; inverted: boolean }) {
  return (
    <p
      className={cn(
        'rounded-[var(--layout-card-radius)] border border-dashed px-4 py-8 text-center text-sm',
        inverted ? 'border-white/25 text-white/70' : 'border-hairline text-muted',
      )}
    >
      {message}
    </p>
  );
}
