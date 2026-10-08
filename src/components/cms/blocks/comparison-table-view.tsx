import Image from 'next/image';
import Link from 'next/link';
import { Check, Info, Minus, X } from 'lucide-react';
import {
  cellAccessibleText,
  cellFor,
  comparisonStyleVars,
  parseCellNumber,
  visibleRows,
  type ComparisonCell,
  type ComparisonColumn,
  type ComparisonTableContent,
} from '@/lib/cms/comparison-table';
import { buttonClasses } from '@/components/ui/button';
import { resolveCmsIcon } from '@/components/ui/icons';
import { safeUrl, sanitizeInlineHtml } from '@/lib/utils/sanitize';
import { cn } from '@/lib/utils/cn';
import { ComparisonScroller } from './comparison-scroller';

/**
 * The comparison table as drawn: the public page and the editor's live
 * preview both render this, so what is previewed is what is published.
 *
 * It takes everything it shows as props — the parsed content and the logos,
 * already resolved — and reads nothing else: no product, no service, no
 * database. That is what keeps the widget independent of the product module,
 * and what lets the same component run in the browser for the preview.
 */

export type ComparisonLogo = {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
};

type ViewProps = {
  content: ComparisonTableContent;
  /** Logos by media id. Missing ids simply draw no logo. */
  logos: Map<string, ComparisonLogo>;
  /** Scopes the DOM ids, so two tables on one page never share one. */
  sectionId: string;
  /** The section paints a dark background: the heading turns light. */
  inverted?: boolean;
  /** For number formatting, from the market being rendered. */
  locale?: string;
  /** The editor's preview: an empty table explains itself instead of vanishing. */
  preview?: boolean;
};

export function ComparisonTableView({
  content,
  logos,
  sectionId,
  inverted = false,
  locale = 'en',
  preview = false,
}: ViewProps) {
  const { style } = content;
  const columns = content.columns;
  const rows = visibleRows(content.rows);
  const hasHeading = Boolean(content.eyebrow || content.heading || content.description);
  const headingId = `ct-${sectionId}-heading`;
  const ctaInHeader = style.ctaPlacement === 'header' || style.ctaPlacement === 'both';
  const ctaInFooter = style.ctaPlacement === 'footer' || style.ctaPlacement === 'both';
  const anyCta = columns.some((column) => ctaShown(column));

  return (
    <div
      className={cn(
        'cms-ct',
        `cms-ct--borders-${style.borders}`,
        `cms-ct--hl-${style.highlightStyle}`,
        `cms-ct--align-${style.valueAlign}`,
        `cms-ct--mobile-${style.mobileLayout}`,
        style.stripes && 'cms-ct--stripes',
        style.rowHover && 'cms-ct--hover',
        style.animate && 'cms-ct--animate',
        style.shadow && 'cms-ct--shadow',
        style.stickyFirstColumn && 'cms-ct--sticky-col',
        style.stickyHeader && 'cms-ct--sticky-head',
        inverted && 'cms-ct--inverted',
        columns.some((column) => column.highlight && column.badge) && 'cms-ct--has-badge',
      )}
      style={comparisonStyleVars(style) as React.CSSProperties}
    >
      {hasHeading ? (
        <div className="cms-measure cms-ct__intro">
          {content.eyebrow ? <p className="cms-ct__eyebrow cms-accent">{content.eyebrow}</p> : null}
          {content.heading ? (
            <h2 id={headingId} className="cms-ct__heading font-heading tracking-tight">
              {content.heading}
            </h2>
          ) : null}
          {content.description ? <p className="cms-ct__description">{content.description}</p> : null}
        </div>
      ) : null}

      {columns.length === 0 ? (
        preview ? (
          <p className="cms-ct__empty">Add a column to start the comparison.</p>
        ) : null
      ) : (
        <>
          <ComparisonScroller
            className="overflow-x-auto"
            label={content.heading ? `${content.heading} (scrollable)` : 'Comparison table (scrollable)'}
          >
            <table
              className="cms-ct__table"
              aria-labelledby={content.heading ? headingId : undefined}
              style={{ '--ct-ncol': String(columns.length) } as React.CSSProperties}
            >
              {content.heading ? null : <caption className="sr-only">Comparison</caption>}
              <thead>
                <tr>
                  <th scope="col" className="cms-ct__corner">
                    <span className="cms-ct__corner-label">{style.featureLabel}</span>
                  </th>
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      scope="col"
                      className={cn('cms-ct__col', columnClasses(column))}
                      style={columnColorStyle(column)}
                    >
                      <ColumnHeader
                        column={column}
                        logo={column.logoId ? logos.get(column.logoId) : undefined}
                        withCta={ctaInHeader}
                        ctaStyle={style.ctaStyle}
                        fullWidth={style.ctaFullWidth}
                      />
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 && preview ? (
                  <tr>
                    <td className="cms-ct__empty" colSpan={columns.length + 1}>
                      Add a feature row to compare the columns.
                    </td>
                  </tr>
                ) : null}
                {rows.map((row) =>
                  row.kind === 'group' ? (
                    <tr key={row.id} className="cms-ct__group">
                      <th scope="colgroup" colSpan={columns.length + 1}>
                        <span className="cms-ct__group-label">{row.label}</span>
                      </th>
                    </tr>
                  ) : (
                    <tr key={row.id} className={cn('cms-ct__row', row.alt && 'is-alt')}>
                      <th scope="row" className="cms-ct__feature">
                        <FeatureLabel
                          label={row.label}
                          tooltip={row.tooltip}
                          id={`ct-${sectionId}-${row.id}-tip`}
                        />
                      </th>
                      {columns.map((column) => (
                        <td
                          key={column.id}
                          className={cn('cms-ct__cell', columnClasses(column))}
                          style={columnColorStyle(column)}
                        >
                          <CellContent cell={cellFor(row, column.id)} locale={locale} />
                        </td>
                      ))}
                    </tr>
                  ),
                )}
              </tbody>

              {ctaInFooter && anyCta ? (
                <tfoot>
                  <tr className="cms-ct__foot">
                    <th scope="row" className="cms-ct__feature">
                      <span className="sr-only">Choose a plan</span>
                    </th>
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={cn('cms-ct__cell', columnClasses(column))}
                        style={columnColorStyle(column)}
                      >
                        <ColumnCta column={column} ctaStyle={style.ctaStyle} fullWidth={style.ctaFullWidth} />
                      </td>
                    ))}
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </ComparisonScroller>

          {style.mobileLayout === 'cards' ? (
            <div className="cms-ct__cards">
              {columns.map((column) => (
                <article
                  key={column.id}
                  className={cn('cms-ct__card', columnClasses(column))}
                  style={columnColorStyle(column)}
                  aria-label={column.name || 'Option'}
                >
                  <div className="cms-ct__card-head">
                    <ColumnHeader
                      column={column}
                      logo={column.logoId ? logos.get(column.logoId) : undefined}
                      withCta={false}
                      ctaStyle={style.ctaStyle}
                      fullWidth
                      as="h3"
                    />
                  </div>
                  <ul className="cms-ct__card-list">
                    {rows.map((row) =>
                      row.kind === 'group' ? (
                        <li key={row.id} className="cms-ct__card-group">
                          {row.label}
                        </li>
                      ) : (
                        <li key={row.id} className="cms-ct__card-row">
                          <span className="cms-ct__card-label">{row.label}</span>
                          <span className="cms-ct__card-value">
                            <CellContent cell={cellFor(row, column.id)} locale={locale} />
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                  {ctaShown(column) ? (
                    <div className="cms-ct__card-cta">
                      <ColumnCta column={column} ctaStyle={style.ctaStyle} fullWidth />
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
        </>
      )}

      {content.disclaimer ? <p className="cms-ct__disclaimer">{content.disclaimer}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function columnClasses(column: ComparisonColumn) {
  return cn(
    column.highlight && 'is-hl',
    column.background && 'has-col-bg',
    column.textColor && 'has-col-fg',
  );
}

function columnColorStyle(column: ComparisonColumn): React.CSSProperties | undefined {
  if (!column.background && !column.textColor) return undefined;
  const vars: Record<string, string> = {};
  if (column.background) vars['--ct-col-bg'] = column.background;
  if (column.textColor) vars['--ct-col-fg'] = column.textColor;
  return vars as React.CSSProperties;
}

function ctaShown(column: ComparisonColumn): boolean {
  return column.showCta && Boolean(column.ctaLabel.trim() && safeUrl(column.ctaUrl));
}

function ColumnHeader({
  column,
  logo,
  withCta,
  ctaStyle,
  fullWidth,
  as: Name = 'span',
}: {
  column: ComparisonColumn;
  logo: ComparisonLogo | undefined;
  withCta: boolean;
  ctaStyle: ComparisonTableContent['style']['ctaStyle'];
  fullWidth: boolean;
  as?: 'span' | 'h3';
}) {
  return (
    <div className="cms-ct__head">
      {column.highlight && column.badge ? <span className="cms-ct__badge">{column.badge}</span> : null}
      {logo ? (
        <Image
          src={logo.url}
          alt={column.logoAlt || logo.alt || ''}
          width={logo.width ?? 160}
          height={logo.height ?? 48}
          className="cms-ct__logo"
        />
      ) : null}
      {column.name ? <Name className="cms-ct__name">{column.name}</Name> : null}
      {column.subtitle ? <span className="cms-ct__subtitle">{column.subtitle}</span> : null}
      {column.price || column.priceNote ? (
        <span className="cms-ct__pricing">
          {column.price ? <span className="cms-ct__price-lg">{column.price}</span> : null}
          {column.priceNote ? <span className="cms-ct__price-note">{column.priceNote}</span> : null}
        </span>
      ) : null}
      {withCta && ctaShown(column) ? (
        <span className="cms-ct__head-cta">
          <ColumnCta column={column} ctaStyle={ctaStyle} fullWidth={fullWidth} />
        </span>
      ) : null}
    </div>
  );
}

function ColumnCta({
  column,
  ctaStyle,
  fullWidth,
}: {
  column: ComparisonColumn;
  ctaStyle: ComparisonTableContent['style']['ctaStyle'];
  fullWidth: boolean;
}) {
  const href = ctaShown(column) ? safeUrl(column.ctaUrl) : null;
  if (!href) return null;
  const external = /^https?:\/\//i.test(href);
  const linkProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  // The highlighted column always gets the filled button: it is the one the
  // table is recommending.
  const variant =
    column.highlight || ctaStyle === 'button' ? 'primary' : ctaStyle === 'outline' ? 'outline' : 'link';

  if (variant === 'link') {
    return (
      <Link href={href} className="cms-ct__cta-link" {...linkProps}>
        {column.ctaLabel}
        <span aria-hidden="true"> →</span>
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className={buttonClasses(
        variant,
        'md',
        cn(
          'btn-tokens cms-ct__cta',
          variant === 'primary' ? 'cms-btn-primary' : 'cms-btn-outline',
          fullWidth && 'w-full',
        ),
      )}
      {...linkProps}
    >
      {column.ctaLabel}
    </Link>
  );
}

function FeatureLabel({ label, tooltip, id }: { label: string; tooltip: string; id: string }) {
  return (
    <span className="cms-ct__feature-inner">
      <span className="cms-ct__feature-label">{label}</span>
      {tooltip ? (
        <span className="cms-ct__tip">
          <button type="button" className="cms-ct__tip-btn" aria-describedby={id}>
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">More about {label}</span>
          </button>
          <span role="tooltip" id={id} className="cms-ct__tip-text">
            {tooltip}
          </span>
        </span>
      ) : null}
    </span>
  );
}

/** One cell's value, by type. */
export function CellContent({ cell, locale = 'en' }: { cell: ComparisonCell; locale?: string }) {
  switch (cell.type) {
    case 'check':
      return (
        <span className="cms-ct__mark">
          <span className="cms-ct__check" aria-hidden="true">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
          <span className="sr-only">Included</span>
          {cell.note ? <span className="cms-ct__note">{cell.note}</span> : null}
        </span>
      );
    case 'cross':
      return (
        <span className="cms-ct__mark">
          <span className="cms-ct__cross" aria-hidden="true">
            <X className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
          <span className="sr-only">Not included</span>
          {cell.note ? <span className="cms-ct__note">{cell.note}</span> : null}
        </span>
      );
    case 'icon': {
      const Icon = resolveCmsIcon(cell.icon);
      return (
        <span className="cms-ct__mark">
          {Icon ? <Icon className="cms-ct__icon h-5 w-5" aria-hidden="true" /> : null}
          {cell.note ? (
            <span className="cms-ct__note">{cell.note}</span>
          ) : (
            <span className="sr-only">{cell.icon}</span>
          )}
        </span>
      );
    }
    case 'number': {
      const parsed = parseCellNumber(cell.value);
      if (parsed === null) return <EmptyMark />;
      return (
        <span className="cms-ct__value">
          <span className="cms-ct__number">{new Intl.NumberFormat(locale).format(parsed)}</span>
          {cell.note ? <span className="cms-ct__unit"> {cell.note}</span> : null}
        </span>
      );
    }
    case 'price':
      if (!cell.value && !cell.note) return <EmptyMark />;
      return (
        <span className="cms-ct__value cms-ct__value--price">
          {cell.value ? <span className="cms-ct__price">{cell.value}</span> : null}
          {cell.note ? <span className="cms-ct__period">{cell.note}</span> : null}
        </span>
      );
    case 'rich': {
      const html = sanitizeInlineHtml(cell.value);
      if (!html) return <EmptyMark />;
      return <span className="cms-ct__rich" dangerouslySetInnerHTML={{ __html: html }} />;
    }
    case 'text':
      if (!cell.value) return <EmptyMark />;
      return (
        <span className="cms-ct__value">
          <span className="cms-ct__text">{cell.value}</span>
          {cell.note ? <span className="cms-ct__note">{cell.note}</span> : null}
        </span>
      );
    default:
      return <EmptyMark />;
  }
}

function EmptyMark() {
  return (
    <span className="cms-ct__na">
      <Minus className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{cellAccessibleText({ type: 'empty', value: '', note: '', icon: 'check' })}</span>
    </span>
  );
}
