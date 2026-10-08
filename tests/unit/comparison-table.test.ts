import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { BLOCKS, BLOCK_PICKER_LIST, blockDefaults, parseBlockContent } from '@/lib/cms/blocks';
import {
  COMPARISON_LIMITS,
  cellAccessibleText,
  comparisonStyleVars,
  comparisonTableSchema,
  parseCell,
  parseCellNumber,
  visibleRows,
  type ComparisonTableContent,
} from '@/lib/cms/comparison-table';

const parse = (raw: unknown) => parseBlockContent<ComparisonTableContent>('comparisonTable', raw);

describe('comparison table block', () => {
  it('is a page block in the Content group, beside the product table it does not replace', () => {
    const block = BLOCKS.comparisonTable!;
    expect(block.group).toBe('Content');
    expect(block.surfaces ?? ['page']).toContain('page');
    expect(BLOCK_PICKER_LIST.some((b) => b.type === 'comparisonTable')).toBe(true);
    expect(BLOCKS.productTable).toBeDefined();
    expect(BLOCKS.productTable!.group).toBe('Products');
  });

  it('starts with demo content that says it is demo content', () => {
    const content = blockDefaults('comparisonTable') as ComparisonTableContent;
    expect(content.columns.map((c) => c.name)).toEqual([
      'Google Workspace',
      'Microsoft 365',
      'Zoho Workplace',
    ]);
    const groups = content.rows.filter((r) => r.kind === 'group').map((r) => r.label);
    expect(groups).toEqual(['Email', 'Storage', 'Collaboration', 'Meetings', 'Administration']);
    expect(content.disclaimer.toLowerCase()).toContain('demo');
    // No unverified price is presented as one.
    for (const column of content.columns) expect(column.price).toBe('$X.XX');
  });

  it('keeps an emptied table empty instead of bringing the demo back', () => {
    const content = parse({ columns: [], rows: [] });
    expect(content.columns).toEqual([]);
    expect(content.rows).toEqual([]);
  });
});

describe('the table never depends on the product module', () => {
  const files = [
    'src/lib/cms/comparison-table.ts',
    'src/components/cms/blocks/comparison-table-block.tsx',
    'src/components/cms/blocks/comparison-table-view.tsx',
    'src/components/cms/blocks/comparison-scroller.tsx',
    'src/components/cms/comparison-table-editor.tsx',
  ];

  it('imports nothing from products and stores no product ids', () => {
    for (const path of files) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).not.toMatch(/from ['"][^'"]*product/i);
      expect(source, path).not.toMatch(/productId|prisma\.product/);
    }
    const shape = JSON.stringify(blockDefaults('comparisonTable'));
    expect(shape).not.toMatch(/productId/);
  });

  it('queries nothing but the column logos when it renders', () => {
    const block = readFileSync('src/components/cms/blocks/comparison-table-block.tsx', 'utf8');
    expect(block).toMatch(/getMediaByIds/);
    expect(block).not.toMatch(/prisma/);
  });
});

describe('parsing never throws a table away', () => {
  it('drops a broken item and keeps the rest', () => {
    const content = parse({
      columns: [{ id: 'col_a', name: 'A' }, 'nonsense', null, { id: 'col_b', name: 'B' }],
      rows: [{ id: 'row_1', label: 'One', cells: { col_a: { type: 'check' } } }, 42],
    });
    expect(content.columns.map((c) => c.name)).toEqual(['A', 'B']);
    expect(content.rows).toHaveLength(1);
    expect(content.rows[0]!.cells.col_a!.type).toBe('check');
  });

  it('repairs missing and duplicate ids deterministically', () => {
    const raw = { columns: [{ name: 'A' }, { id: 'same', name: 'B' }, { id: 'same', name: 'C' }], rows: [] };
    const first = parse(raw).columns.map((c) => c.id);
    expect(new Set(first).size).toBe(3);
    expect(parse(raw).columns.map((c) => c.id)).toEqual(first);
  });

  it('falls back field by field', () => {
    const content = parse({
      columns: [{ id: 'col_a', name: 'A', highlight: 'yes', background: 'red;}' }],
      rows: [],
      style: { radius: 'huge', stickyHeader: true, density: 7 },
    });
    expect(content.columns[0]!.highlight).toBe(false);
    expect(content.columns[0]!.background).toBe('');
    expect(content.style.radius).toBe('lg');
    expect(content.style.stickyHeader).toBe(true);
    expect(content.style.density).toBe('comfortable');
  });

  it('caps columns and rows at their limits', () => {
    const columns = Array.from({ length: 20 }, (_, i) => ({ id: `col_${i}`, name: `C${i}` }));
    const rows = Array.from({ length: 400 }, (_, i) => ({ id: `row_${i}`, label: `R${i}` }));
    const content = parse({ columns, rows });
    expect(content.columns).toHaveLength(COMPARISON_LIMITS.columns);
    expect(content.rows).toHaveLength(COMPARISON_LIMITS.rows);
  });

  it('drops the values of a deleted column', () => {
    const content = parse({
      columns: [{ id: 'col_a', name: 'A' }],
      rows: [{ id: 'row_1', label: 'x', cells: { col_a: { type: 'check' }, col_gone: { type: 'cross' } } }],
    });
    expect(Object.keys(content.rows[0]!.cells)).toEqual(['col_a']);
  });

  it('survives the server-side parse unchanged on a second pass', () => {
    const once = comparisonTableSchema.parse(blockDefaults('comparisonTable'));
    expect(comparisonTableSchema.parse(once)).toEqual(once);
  });
});

describe('cell values', () => {
  it('accepts numbers as people type them and nothing else', () => {
    expect(parseCellNumber('1,000')).toBe(1000);
    expect(parseCellNumber('2.5')).toBe(2.5);
    expect(parseCellNumber('-3')).toBe(-3);
    expect(parseCellNumber('lots')).toBeNull();
    expect(parseCellNumber('1e9')).toBeNull();
    expect(parseCell({ type: 'number', value: 'abc' }).value).toBe('');
    expect(parseCell({ type: 'number', value: '30' }).value).toBe('30');
  });

  it('stores rich text sanitised to inline formatting', () => {
    const cell = parseCell({
      type: 'rich',
      value: '<script>alert(1)</script><strong>Bold</strong> <a href="javascript:alert(2)">x</a> <img src=x onerror=alert(3)><h2>Big</h2>',
    });
    expect(cell.value).not.toMatch(/script|javascript|onerror|<img|<h2/i);
    expect(cell.value).toContain('<strong>Bold</strong>');
  });

  it('keeps only links the site would follow', () => {
    const cta = (ctaUrl: string) => parse({ columns: [{ id: 'col_a', ctaUrl }], rows: [] }).columns[0]!.ctaUrl;
    expect(cta('javascript:alert(1)')).toBe('');
    expect(cta('data:text/html,hi')).toBe('');
    expect(cta('/contact')).toBe('/contact');
    expect(cta('https://example.com/x')).toBe('https://example.com/x');
    expect(cta('#popup-abc')).toBe('#popup-abc');
  });

  it('drops a price period’s leading slash so a market never rewrites it as a path', () => {
    expect(parseCell({ type: 'price', value: '$9', note: '/month' }).note).toBe('month');
  });

  it('falls back to an empty cell for an unknown type or icon', () => {
    expect(parseCell({ type: 'sparkle' }).type).toBe('empty');
    expect(parseCell({ type: 'icon', icon: 'not-an-icon' }).icon).toBe('check');
  });

  it('describes every value in words for screen readers', () => {
    expect(cellAccessibleText(parseCell({ type: 'check' }))).toBe('Included');
    expect(cellAccessibleText(parseCell({ type: 'cross', note: 'Add-on' }))).toBe('Not included: Add-on');
    expect(cellAccessibleText(parseCell({ type: 'empty' }))).toBe('Not applicable');
  });
});

describe('the rows a visitor sees', () => {
  const rows = parse({
    columns: [{ id: 'col_a' }],
    rows: [
      { id: 'g1', kind: 'group', label: 'Shown group' },
      { id: 'r1', label: 'one' },
      { id: 'r2', label: 'two', hidden: true },
      { id: 'r3', label: 'three' },
      { id: 'g2', kind: 'group', label: 'Hidden group', hidden: true },
      { id: 'r4', label: 'four' },
      { id: 'g3', kind: 'group', label: 'Empty group' },
      { id: 'r5', label: 'five', hidden: true },
    ],
  }).rows;

  it('hides hidden rows, and everything under a hidden group', () => {
    expect(visibleRows(rows).map((r) => r.id)).toEqual(['g1', 'r1', 'r3']);
  });

  it('drops a group with nothing visible under it', () => {
    expect(visibleRows(rows).some((r) => r.id === 'g3')).toBe(false);
  });

  it('alternates stripes among visible rows, restarting under each group', () => {
    const visible = visibleRows(rows).filter((r) => r.kind === 'feature');
    expect(visible.map((r) => r.alt)).toEqual([false, true]);
  });
});

describe('design values', () => {
  it('writes only the colours that were chosen', () => {
    const style = parse({ columns: [], rows: [] }).style;
    const vars = comparisonStyleVars(style);
    expect(vars['--ct-bg']).toBeUndefined();
    expect(vars['--ct-radius']).toBe('1.25rem');
    const custom = comparisonStyleVars(parse({ columns: [], rows: [], style: { tableBackground: '#ffffff', columnMinWidth: '180' } }).style);
    expect(custom['--ct-bg']).toBe('#FFFFFF');
    expect(custom['--ct-col-min']).toBe('180px');
  });

  it('refuses a length that is not one', () => {
    const style = parse({ columns: [], rows: [], style: { columnMinWidth: '1px;}body{display:none' } }).style;
    expect(comparisonStyleVars(style)['--ct-col-min']).toBeUndefined();
  });
});
