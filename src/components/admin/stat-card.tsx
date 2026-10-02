import Link from 'next/link';
import { ArrowUpRight, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatNumber } from '@/lib/utils/format';
import { NavIcon } from './nav-icon';

export type StatTone = 'default' | 'brand' | 'success' | 'danger' | 'warning';

/**
 * KPI tile — icon, label, value, trend and an optional sparkline (DESIGN.md §12).
 *
 * Deliberately restrained: one number, one label, optional supporting line.
 * Colour is reserved for values that carry meaning (won, lost) so the eye is
 * drawn to something real rather than to decoration. A trend always carries an
 * arrow and a sign as well as a colour, so it never relies on colour alone.
 */
export function StatCard({
  label,
  value,
  hint,
  href,
  icon,
  tone = 'default',
  trend,
  trendLabel = 'vs previous period',
  sparkline,
  invertTrend = false,
  className,
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  /** NavIcon key. */
  icon?: string;
  tone?: StatTone;
  /** Percentage change against the previous period; omitted when unknown. */
  trend?: number | null;
  trendLabel?: string;
  /** Recent values, oldest first, drawn as a small line. */
  sparkline?: number[];
  /** For a figure where going up is bad news (lost leads): a rise reads red. */
  invertTrend?: boolean;
  className?: string;
}) {
  const good = trend != null && (invertTrend ? trend < 0 : trend > 0);
  const bad = trend != null && (invertTrend ? trend > 0 : trend < 0);
  const valueTone = {
    default: 'text-content',
    brand: 'text-brand',
    success: 'text-emerald-600',
    danger: 'text-red-600',
    warning: 'text-amber-600',
  }[tone];

  const iconTone = {
    default: 'bg-muted/10 text-muted',
    brand: 'bg-brand/10 text-brand',
    success: 'bg-emerald-50 text-emerald-600',
    danger: 'bg-red-50 text-red-600',
    warning: 'bg-amber-50 text-amber-600',
  }[tone];

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 break-words text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
        {icon ? (
          <span
            className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', iconTone)}
          >
            <NavIcon name={icon} className="h-4 w-4" />
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p
          className={cn(
            'font-heading text-[1.625rem] font-semibold leading-none tracking-tight sm:text-[1.875rem]',
            valueTone,
          )}
        >
          {typeof value === 'number' ? formatNumber(value) : value}
        </p>
        {sparkline && sparkline.length > 1 ? <Sparkline values={sparkline} /> : null}
      </div>

      {trend !== undefined && trend !== null && Number.isFinite(trend) ? (
        <p className="mt-2 flex items-center gap-1 text-xs">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium',
              good && 'bg-emerald-50 text-emerald-700',
              bad && 'bg-red-50 text-red-700',
              trend === 0 && 'bg-muted/10 text-muted',
            )}
          >
            {trend > 0 ? <TrendingUp className="h-3 w-3" aria-hidden="true" /> : null}
            {trend < 0 ? <TrendingDown className="h-3 w-3" aria-hidden="true" /> : null}
            {trend > 0 ? '+' : ''}
            {trend.toFixed(Math.abs(trend) < 10 ? 1 : 0)}%
          </span>
          <span className="truncate text-muted">{trendLabel}</span>
        </p>
      ) : null}

      <div className="mt-1 flex items-center gap-1">
        {hint ? <p className="truncate text-xs text-muted">{hint}</p> : null}
        {href ? (
          <ArrowUpRight
            className="ml-auto h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
          />
        ) : null}
      </div>
    </>
  );

  const shell = cn(
    // Light glass in the admin (DESIGN.md §7: KPI cards); solid white elsewhere.
    'admin-glass-card group flex h-full flex-col rounded-[var(--admin-radius-card,0.75rem)] border border-hairline bg-surface p-4 sm:p-5',
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          shell,
          'transition-[box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-[var(--admin-shadow-md)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        )}
      >
        {body}
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}

/**
 * A small trend line. Decorative: the value and the trend beside it carry the
 * meaning, so it is hidden from assistive technology.
 */
function Sparkline({ values }: { values: number[] }) {
  const width = 72;
  const height = 28;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const points = values.map((value, index) => [
    index * step,
    height - 2 - ((value - min) / span) * (height - 4),
  ]);
  const line = points.map(([x, y]) => `${x!.toFixed(1)},${y!.toFixed(1)}`).join(' ');
  const area = `0,${height} ${line} ${width},${height}`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="shrink-0 text-brand"
      aria-hidden="true"
      focusable="false"
    >
      <polygon points={area} fill="currentColor" opacity={0.08} />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

