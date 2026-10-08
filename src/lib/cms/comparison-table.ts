import { z } from 'zod';
import { normaliseColor } from './color';
import { normaliseLength } from './design';
import { CMS_ICON_NAMES } from '@/components/ui/icon-names';
import { safeUrl, sanitizeInlineHtml } from '@/lib/utils/sanitize';

/**
 * The comparison table: a hand-built table, independent of the product module.
 *
 * Everything it shows is typed into the section. It stores no product ids,
 * reads no product table and asks no service for anything, so a page can
 * compare anything at all — suites from three vendors, three plans, three
 * ways of doing something — and render it without one database query beyond
 * the logos it was given.
 *
 * The content is JSON in the section's own `content` column, like every other
 * block. This module is its schema, its defaults and the small pure helpers
 * the renderer and the editor share.
 *
 * ## Parsing never throws away the table
 *
 * `parseBlockContent` replaces content that fails its schema with the block's
 * defaults. For most blocks that is a few fields; here it would be a table
 * someone spent an hour on, replaced by the demo. So every field below
 * recovers on its own (`.catch`), lists are read item by item and a broken
 * item is dropped rather than failing the list, and ids are repaired rather
 * than rejected. A cell with a bad value becomes an empty cell; it never takes
 * the rest of the table with it.
 */

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

export const COMPARISON_LIMITS = {
  columns: 8,
  /** Feature rows and group rows together. */
  rows: 150,
} as const;

// ---------------------------------------------------------------------------
// Ids
// ---------------------------------------------------------------------------

const ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;

/**
 * A new id for a column or a row.
 *
 * Ids are what cells are keyed by and what React keys the editor's inputs by,
 * so they are minted once and kept — reordering, renaming or duplicating
 * never changes an existing one.
 */
export function newComparisonId(prefix: 'col' | 'row' | 'grp'): string {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${random}`;
}

/**
 * Keeps each id valid and unique within its list, repairing rather than
 * rejecting. The repair is deterministic — the same stored content always
 * comes back with the same ids — so it is stable across renders.
 */
function repairIds<T extends { id: string }>(items: T[], prefix: string): T[] {
  const seen = new Set<string>();
  return items.map((item, index) => {
    let id = ID_PATTERN.test(item.id) ? item.id : `${prefix}_${index + 1}`;
    let suffix = 2;
    while (seen.has(id)) id = `${prefix}_${index + 1}_${suffix++}`;
    seen.add(id);
    return id === item.id ? item : { ...item, id };
  });
}

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------

const text = (max: number) => z.string().max(max).catch('').default('');
const flag = (fallback: boolean) => z.boolean().catch(fallback).default(fallback);
const color = z
  .string()
  .max(40)
  .catch('')
  .default('')
  .transform((value) => normaliseColor(value));
const length = z
  .string()
  .max(16)
  .catch('')
  .default('')
  .transform((value) => {
    const parsed = normaliseLength(value);
    return parsed.startsWith('-') ? '' : parsed;
  });

/** Reads a list item by item, dropping what cannot be read. */
function readList<T>(raw: unknown, schema: z.ZodType<T>, max: number): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  for (const item of raw) {
    if (out.length >= max) break;
    const parsed = schema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

export const CELL_TYPES = [
  'text',
  'rich',
  'check',
  'cross',
  'icon',
  'number',
  'price',
  'empty',
] as const;
export type CellType = (typeof CELL_TYPES)[number];

export const CELL_TYPE_LABELS: Record<CellType, string> = {
  text: 'Text',
  rich: 'Rich text',
  check: 'Checkmark',
  cross: 'Cross',
  icon: 'Icon',
  number: 'Number',
  price: 'Price',
  empty: 'Empty / N/A',
};

/**
 * A number as an administrator types it: digits, one decimal point, thousands
 * separators and a sign. Anything else in a number cell is not a number and
 * is dropped, so the table never formats "lots" as NaN.
 */
export function parseCellNumber(value: string): number | null {
  const cleaned = value.replace(/[,\s]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * A price's period is shown after it ("per user / month"). A leading slash is
 * dropped: stored content strings that start with "/" are treated as site
 * paths and rewritten into a market's URL space when the page renders, which
 * would turn "/month" into "/ae/month" in another storefront.
 */
function stripLeadingSlash(value: string): string {
  return value.replace(/^\s*\/+\s*/, '');
}

const cellObject = z
  .object({
    type: z.enum(CELL_TYPES).catch('empty').default('empty'),
    /** The text, the rich text, the number or the price amount. */
    value: text(600),
    /**
     * A short second line: the note under a checkmark, the unit after a
     * number, the period after a price, the label beside an icon.
     */
    note: text(120),
    icon: z.enum(CMS_ICON_NAMES).catch('check').default('check'),
  })
  .transform((cell) => {
    if (cell.type === 'number' && cell.value && parseCellNumber(cell.value) === null) {
      return { ...cell, value: '' };
    }
    if (cell.type === 'price') return { ...cell, note: stripLeadingSlash(cell.note) };
    // Stored already clean, so nothing that reads the content later has to
    // remember to sanitise it. The renderer sanitises again regardless.
    if (cell.type === 'rich') return { ...cell, value: sanitizeInlineHtml(cell.value) };
    return cell;
  });

export type ComparisonCell = z.infer<typeof cellObject>;

export const EMPTY_CELL: ComparisonCell = { type: 'empty', value: '', note: '', icon: 'check' };

export function parseCell(raw: unknown): ComparisonCell {
  const parsed = cellObject.safeParse(raw ?? {});
  return parsed.success ? parsed.data : EMPTY_CELL;
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const columnObject = z.object({
  id: z.string().max(40).catch('').default(''),
  name: text(80),
  subtitle: text(160),
  /** Media library id. Optional: a column without one shows its name alone. */
  logoId: z.string().max(40).nullable().catch(null).default(null),
  logoAlt: text(160),
  price: text(40),
  /** "per user / month", "billed annually", "Contact sales". */
  priceNote: text(120),
  ctaLabel: text(40),
  /** Only a link the site would follow: a path, an anchor, http(s), mailto or tel. */
  ctaUrl: text(500).transform((value) => (safeUrl(value) ? value.trim() : '')),
  showCta: flag(true),
  /** The recommended column, drawn in the highlight colour. */
  highlight: flag(false),
  /** Shown above a highlighted column, such as "Recommended". */
  badge: text(30),
  background: color,
  textColor: color,
});

export type ComparisonColumn = z.infer<typeof columnObject>;

export function blankColumn(name = ''): ComparisonColumn {
  return {
    ...columnObject.parse({}),
    id: newComparisonId('col'),
    name,
  };
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

const rowObject = z.object({
  id: z.string().max(40).catch('').default(''),
  /**
   * A feature row compares; a group row is a heading for the feature rows
   * after it, up to the next group. Keeping both in one ordered list is what
   * lets one drag move a feature between groups.
   */
  kind: z.enum(['feature', 'group']).catch('feature').default('feature'),
  label: text(160),
  /** Explains the feature in a tooltip beside its name. */
  tooltip: text(400),
  /** Hidden rows stay in the editor and leave the published table. */
  hidden: flag(false),
  /** Keyed by column id, so reordering columns never shuffles values. */
  cells: z
    .unknown()
    .catch({})
    .transform((raw): Record<string, ComparisonCell> => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
      const out: Record<string, ComparisonCell> = {};
      for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
        if (ID_PATTERN.test(key)) out[key] = parseCell(value);
      }
      return out;
    }),
});

export type ComparisonRow = z.infer<typeof rowObject>;

export function blankRow(kind: ComparisonRow['kind'] = 'feature', label = ''): ComparisonRow {
  return {
    id: newComparisonId(kind === 'group' ? 'grp' : 'row'),
    kind,
    label,
    tooltip: '',
    hidden: false,
    cells: {},
  };
}

// ---------------------------------------------------------------------------
// Table design
// ---------------------------------------------------------------------------

export const COMPARISON_RADII = ['none', 'sm', 'md', 'lg', 'xl'] as const;

const styleObject = z.object({
  /** Header text for the feature-name column. */
  featureLabel: z.string().max(60).catch('Features').default('Features'),
  featureWidth: z.enum(['sm', 'md', 'lg']).catch('md').default('md'),
  /** Narrowest a value column may get before the table scrolls instead. */
  columnMinWidth: length,

  tableBackground: color,
  headerBackground: color,
  headerText: color,
  groupBackground: color,
  borderColor: color,
  stripes: flag(true),
  stripeColor: color,
  highlightColor: color,
  highlightStyle: z.enum(['tint', 'outline', 'both']).catch('both').default('both'),

  borders: z.enum(['rows', 'grid', 'none']).catch('rows').default('rows'),
  radius: z.enum(COMPARISON_RADII).catch('lg').default('lg'),
  shadow: flag(true),
  density: z.enum(['compact', 'comfortable', 'spacious']).catch('comfortable').default('comfortable'),
  fontSize: z.enum(['sm', 'md', 'lg']).catch('md').default('md'),
  headerWeight: z.enum(['500', '600', '700']).catch('600').default('600'),
  valueAlign: z.enum(['left', 'center']).catch('center').default('center'),

  stickyHeader: flag(false),
  stickyFirstColumn: flag(true),
  mobileLayout: z.enum(['scroll', 'cards']).catch('scroll').default('scroll'),

  ctaPlacement: z.enum(['header', 'footer', 'both']).catch('header').default('header'),
  ctaStyle: z.enum(['button', 'outline', 'link']).catch('outline').default('outline'),
  ctaFullWidth: flag(true),

  rowHover: flag(true),
  animate: flag(true),
});

export type ComparisonStyle = z.infer<typeof styleObject>;

// ---------------------------------------------------------------------------
// Demo content
// ---------------------------------------------------------------------------

/**
 * What a new comparison table starts with: three workplace suites, ready to
 * edit. Every value is a placeholder and says so — the prices are "$X.XX",
 * the capacities "XX GB" — so nothing unverified can be published looking
 * like a fact. Checkmarks mark broad categories each suite is known to cover,
 * and the disclaimer under the table says the whole thing is demo content.
 */
const DEMO_COLUMNS = [
  {
    id: 'col_gws',
    name: 'Google Workspace',
    subtitle: 'Demo column — replace with your plan',
    price: '$X.XX',
    priceNote: 'per user / month · demo',
    ctaLabel: 'Get a quote',
    ctaUrl: '/contact',
    highlight: true,
    badge: 'Recommended',
  },
  {
    id: 'col_m365',
    name: 'Microsoft 365',
    subtitle: 'Demo column — replace with your plan',
    price: '$X.XX',
    priceNote: 'per user / month · demo',
    ctaLabel: 'Get a quote',
    ctaUrl: '/contact',
  },
  {
    id: 'col_zoho',
    name: 'Zoho Workplace',
    subtitle: 'Demo column — replace with your plan',
    price: '$X.XX',
    priceNote: 'per user / month · demo',
    ctaLabel: 'Get a quote',
    ctaUrl: '/contact',
  },
];

const check = (note = '') => ({ type: 'check', note });
const demoText = (value: string) => ({ type: 'text', value });
const same = (cell: Record<string, unknown>) => ({ col_gws: cell, col_m365: cell, col_zoho: cell });

const DEMO_ROWS = [
  { id: 'grp_email', kind: 'group', label: 'Email' },
  {
    id: 'row_email',
    label: 'Business email on your domain',
    tooltip: 'Demo row. Confirm each value against the vendor’s current plan.',
    cells: same(check()),
  },
  {
    id: 'row_mailbox',
    label: 'Mailbox size',
    cells: same(demoText('XX GB (demo)')),
  },
  { id: 'grp_storage', kind: 'group', label: 'Storage' },
  {
    id: 'row_storage',
    label: 'Cloud storage per user',
    tooltip: 'Placeholder capacity. Replace with the verified figure.',
    cells: same({ type: 'number', value: '0', note: 'GB (demo)' }),
  },
  { id: 'grp_collab', kind: 'group', label: 'Collaboration' },
  {
    id: 'row_docs',
    label: 'Documents, spreadsheets and slides',
    cells: same(check()),
  },
  {
    id: 'row_coedit',
    label: 'Real-time co-editing',
    cells: same(check()),
  },
  { id: 'grp_meet', kind: 'group', label: 'Meetings' },
  {
    id: 'row_video',
    label: 'Video meetings',
    cells: {
      col_gws: { type: 'icon', icon: 'users', note: 'Demo value' },
      col_m365: { type: 'icon', icon: 'users', note: 'Demo value' },
      col_zoho: { type: 'icon', icon: 'users', note: 'Demo value' },
    },
  },
  {
    id: 'row_participants',
    label: 'Meeting participants',
    cells: same(demoText('Up to XX (demo)')),
  },
  { id: 'grp_admin', kind: 'group', label: 'Administration' },
  {
    id: 'row_console',
    label: 'Admin console',
    cells: same(check()),
  },
  {
    id: 'row_security',
    label: 'Advanced security controls',
    tooltip: 'Availability often depends on the plan. Demo value.',
    cells: {
      col_gws: { type: 'rich', value: 'Plan dependent <em>(demo)</em>' },
      col_m365: { type: 'rich', value: 'Plan dependent <em>(demo)</em>' },
      col_zoho: { type: 'rich', value: 'Plan dependent <em>(demo)</em>' },
    },
  },
  {
    id: 'row_migration',
    label: 'Assisted migration',
    cells: {
      col_gws: { type: 'check', note: 'Demo value' },
      col_m365: { type: 'check', note: 'Demo value' },
      col_zoho: { type: 'empty' },
    },
  },
];

// ---------------------------------------------------------------------------
// The block schema
// ---------------------------------------------------------------------------

function normaliseColumns(raw: unknown): ComparisonColumn[] {
  return repairIds(readList(raw, columnObject, COMPARISON_LIMITS.columns), 'col');
}

function normaliseRows(raw: unknown): ComparisonRow[] {
  return repairIds(readList(raw, rowObject, COMPARISON_LIMITS.rows), 'row');
}

/**
 * Fills the three structured keys before validation: a missing `columns` or
 * `rows` is a brand-new section and gets the demo; anything present — an empty
 * list included — is the administrator's and is kept.
 */
function withStructure(raw: unknown): Record<string, unknown> {
  const record =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...(raw as Record<string, unknown>) } : {};
  if (record.columns === undefined) record.columns = DEMO_COLUMNS;
  if (record.rows === undefined) record.rows = DEMO_ROWS;
  if (record.style === undefined) record.style = {};
  return record;
}

const comparisonTableObject = z
  .object({
    eyebrow: text(80),
    heading: z.string().max(240).catch('').default('Compare workplace suites'),
    description: z
      .string()
      .max(800)
      .catch('')
      .default(
        'Demo content: placeholder values to show the layout. Replace every value with verified details before publishing.',
      ),
    /** Small print under the table. */
    disclaimer: z
      .string()
      .max(400)
      .catch('')
      .default(
        'Demo comparison. Prices, limits and features are placeholders, not verified vendor information.',
      ),
    columns: z.unknown().transform(normaliseColumns),
    rows: z.unknown().transform(normaliseRows),
    style: z.unknown().transform((raw) => {
      const parsed = styleObject.safeParse(raw ?? {});
      return parsed.success ? parsed.data : styleObject.parse({});
    }),
  })
  .transform((content) => {
    // Cells for columns that no longer exist are dropped, so deleting a column
    // leaves nothing behind in the stored rows.
    const columnIds = new Set(content.columns.map((column) => column.id));
    return {
      ...content,
      rows: content.rows.map((row) => {
        const kept = Object.entries(row.cells).filter(([id]) => columnIds.has(id));
        return kept.length === Object.keys(row.cells).length
          ? row
          : { ...row, cells: Object.fromEntries(kept) };
      }),
    };
  });

export const comparisonTableSchema = z.preprocess(withStructure, comparisonTableObject);

export type ComparisonTableContent = z.infer<typeof comparisonTableSchema>;

// ---------------------------------------------------------------------------
// Helpers shared by the renderer and the editor
// ---------------------------------------------------------------------------

export function cellFor(row: ComparisonRow, columnId: string): ComparisonCell {
  return row.cells[columnId] ?? EMPTY_CELL;
}

/**
 * The rows a visitor sees, each with its stripe parity.
 *
 * A hidden group hides the features under it too: hiding "Meetings" means the
 * meeting rows go with it. A group with no visible features under it is
 * dropped, so the published table never shows a heading over nothing.
 */
export function visibleRows(rows: ComparisonRow[]): Array<ComparisonRow & { alt: boolean }> {
  const out: Array<ComparisonRow & { alt: boolean }> = [];
  let groupHidden = false;
  let pendingGroup: ComparisonRow | null = null;
  let stripe = 0;
  for (const row of rows) {
    if (row.kind === 'group') {
      groupHidden = row.hidden;
      pendingGroup = row.hidden ? null : row;
      // Stripes restart under each heading, so every group starts on the same tone.
      stripe = 0;
      continue;
    }
    if (row.hidden || groupHidden) continue;
    if (pendingGroup) {
      out.push({ ...pendingGroup, alt: false });
      pendingGroup = null;
    }
    out.push({ ...row, alt: stripe % 2 === 1 });
    stripe += 1;
  }
  return out;
}

/** A cell's meaning as text, for screen readers and the stacked mobile cards. */
export function cellAccessibleText(cell: ComparisonCell): string {
  switch (cell.type) {
    case 'check':
      return cell.note ? `Included: ${cell.note}` : 'Included';
    case 'cross':
      return cell.note ? `Not included: ${cell.note}` : 'Not included';
    case 'empty':
      return 'Not applicable';
    default:
      return [cell.value, cell.note].filter(Boolean).join(' ');
  }
}

export const COMPARISON_RADIUS_VALUE: Record<(typeof COMPARISON_RADII)[number], string> = {
  none: '0px',
  sm: '0.5rem',
  md: '0.875rem',
  lg: '1.25rem',
  xl: '1.75rem',
};

/**
 * The table's design as CSS custom properties, read by `.cms-ct` in
 * globals.css. Only what was set is written; everything else falls back to
 * the site's own tokens there, so a table left at its defaults looks like
 * the rest of the site.
 */
export function comparisonStyleVars(style: ComparisonStyle): Record<string, string> {
  const vars: Record<string, string> = {
    '--ct-radius': COMPARISON_RADIUS_VALUE[style.radius],
    '--ct-feature-w': { sm: '11rem', md: '14rem', lg: '18rem' }[style.featureWidth],
    '--ct-pad-y': { compact: '0.55rem', comfortable: '0.85rem', spacious: '1.15rem' }[style.density],
    '--ct-pad-x': { compact: '0.75rem', comfortable: '1rem', spacious: '1.35rem' }[style.density],
    '--ct-font': { sm: '0.8125rem', md: '0.9375rem', lg: '1.0625rem' }[style.fontSize],
    '--ct-head-weight': style.headerWeight,
  };
  const put = (name: string, value: string) => {
    if (value) vars[name] = value;
  };
  put('--ct-col-min', style.columnMinWidth);
  put('--ct-bg', style.tableBackground);
  put('--ct-head-bg', style.headerBackground);
  put('--ct-head-fg', style.headerText);
  put('--ct-group-bg', style.groupBackground);
  put('--ct-border', style.borderColor);
  put('--ct-stripe', style.stripeColor);
  put('--ct-hl', style.highlightColor);
  return vars;
}
