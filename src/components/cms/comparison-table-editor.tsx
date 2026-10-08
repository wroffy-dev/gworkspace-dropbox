'use client';

import * as React from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDown,
  ArrowUp,
  Bold,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  FolderPlus,
  GripVertical,
  Info,
  Italic,
  Link2,
  Maximize2,
  Minimize2,
  Plus,
  Star,
  Trash,
} from 'lucide-react';
import { getMediaById } from '@/lib/actions/media';
import { parseBlockContent } from '@/lib/cms/blocks';
import {
  CELL_TYPES,
  CELL_TYPE_LABELS,
  COMPARISON_LIMITS,
  EMPTY_CELL,
  blankColumn,
  blankRow,
  newComparisonId,
  parseCellNumber,
  type CellType,
  type ComparisonCell,
  type ComparisonColumn,
  type ComparisonRow,
  type ComparisonTableContent,
} from '@/lib/cms/comparison-table';
import { CMS_ICON_NAMES } from '@/components/ui/icon-names';
import { resolveCmsIcon } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/field';
import { MediaPicker } from '@/components/admin/media-picker';
import { cn } from '@/lib/utils/cn';
import { ColorInput } from './design-controls';
import { FieldList } from './field-renderer';
import { LinkInput } from './link-input';
import { ComparisonTableView, type ComparisonLogo } from './blocks/comparison-table-view';
import type { ContentEditorProps } from './content-editors';

/**
 * The comparison table's Content tab.
 *
 * Three parts, top to bottom: the heading and design fields (the registry's,
 * through the shared field list), the columns, and the grid of rows and
 * values. A live preview — the same component the public page renders — can
 * be shown above it all.
 *
 * ## What it edits
 *
 * The draft as it is, not a parsed copy. Parsing normalises (a number cell
 * holding "1." is not yet a number), and re-parsing on every keystroke would
 * fight the person typing. The draft goes to the server on Save, where the
 * schema normalises it once; the preview shows the parsed version, so what it
 * draws is what will be saved.
 *
 * ## Undo
 *
 * Every edit is named after what it touched — a column field, a row label, a
 * cell — so Undo steps back one cell at a time rather than one table at a
 * time. Structural changes (add, delete, duplicate, reorder) each get a name
 * of their own, so each is its own step.
 */

type Column = ComparisonColumn;
type Row = ComparisonRow;

const DEFAULT_COLUMN: Column = {
  ...blankColumn(''),
  id: '',
};

/** A stored column, with any field it lacks filled in. */
function readColumn(raw: unknown): Column {
  return { ...DEFAULT_COLUMN, ...(raw as Partial<Column>) };
}

function readRow(raw: unknown): Row {
  const row = raw as Partial<Row>;
  return {
    id: row.id ?? '',
    kind: row.kind === 'group' ? 'group' : 'feature',
    label: row.label ?? '',
    tooltip: row.tooltip ?? '',
    hidden: Boolean(row.hidden),
    cells: row.cells && typeof row.cells === 'object' ? row.cells : {},
  };
}

function readCell(row: Row, columnId: string): ComparisonCell {
  return { ...EMPTY_CELL, ...(row.cells[columnId] ?? {}) };
}

/** A unique name for an edit that should always be a step of its own. */
let stepCounter = 0;
const step = (name: string) => `${name}:${++stepCounter}`;

export function ComparisonTableEditor({
  fields,
  values,
  onChange,
  onChangeMany,
  onChangeAs,
  idPrefix,
}: ContentEditorProps) {
  const parsed = React.useMemo(
    () => parseBlockContent<ComparisonTableContent>('comparisonTable', values),
    [values],
  );

  const columns: Column[] = Array.isArray(values.columns)
    ? (values.columns as unknown[]).map(readColumn)
    : parsed.columns;
  const rows: Row[] = Array.isArray(values.rows)
    ? (values.rows as unknown[]).map(readRow)
    : parsed.rows;

  const write = React.useCallback(
    (control: string, name: 'columns' | 'rows', value: unknown) => {
      if (onChangeAs) onChangeAs(control, { [name]: value });
      else onChange(name, value);
    },
    [onChange, onChangeAs],
  );

  const setColumns = (next: Column[], control: string) => write(control, 'columns', next);
  const setRows = (next: Row[], control: string) => write(control, 'rows', next);

  const [expanded, setExpanded] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(true);
  const logos = useLogos(columns.map((column) => column.logoId).filter(Boolean) as string[]);

  // Esc leaves full screen, the way it closes every other overlay.
  React.useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [expanded]);

  const featureCount = rows.filter((row) => row.kind === 'feature').length;
  const groupCount = rows.length - featureCount;

  return (
    <div
      className={cn(
        'cms-ct-editor space-y-4',
        expanded && 'fixed inset-0 z-modal overflow-y-auto bg-admin-workspace p-4 sm:p-6',
      )}
      role={expanded ? 'dialog' : undefined}
      aria-modal={expanded ? true : undefined}
      aria-label={expanded ? 'Comparison table editor, full screen' : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-content">Comparison table</h3>
          <p className="text-xs text-muted">
            {columns.length} {columns.length === 1 ? 'column' : 'columns'} · {featureCount}{' '}
            {featureCount === 1 ? 'row' : 'rows'}
            {groupCount > 0 ? ` · ${groupCount} ${groupCount === 1 ? 'group' : 'groups'}` : ''}. Typed
            in here, not taken from Products.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview((value) => !value)}
            aria-pressed={showPreview}
          >
            {showPreview ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            {showPreview ? 'Hide preview' : 'Show preview'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExpanded((value) => !value)}>
            {expanded ? (
              <Minimize2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            )}
            {expanded ? 'Done' : 'Full screen'}
          </Button>
        </div>
      </div>

      {showPreview ? (
        <section
          aria-label="Live preview"
          className="cms-ct-editor__preview rounded-xl border border-hairline bg-surface p-3 sm:p-5"
        >
          <p className="mb-3 text-xs text-muted">
            Live preview. Updates as you edit; save the section to publish. Website fonts and
            colours apply on the page itself.
          </p>
          <ComparisonTableView
            content={parsed}
            logos={logos}
            sectionId={`${idPrefix}-preview`}
            preview
          />
        </section>
      ) : null}

      <ColumnsEditor
        columns={columns}
        rows={rows}
        idPrefix={idPrefix}
        onColumns={setColumns}
        onBoth={(nextColumns, nextRows, control) => {
          // Two fields in one step: a duplicated column brings its values along,
          // and a deleted one takes them away.
          if (onChangeAs) onChangeAs(control, { columns: nextColumns, rows: nextRows });
          else onChangeMany({ columns: nextColumns, rows: nextRows });
        }}
      />

      <RowsEditor columns={columns} rows={rows} idPrefix={idPrefix} onRows={setRows} />

      <FieldList
        fields={fields}
        values={values}
        onChange={onChange}
        onChangeMany={onChangeMany}
        idPrefix={idPrefix}
        collapsibleGroups
        defaultOpenGroups={['Heading']}
        layout="container"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

function ColumnsEditor({
  columns,
  rows,
  idPrefix,
  onColumns,
  onBoth,
}: {
  columns: Column[];
  rows: Row[];
  idPrefix: string;
  onColumns: (next: Column[], control: string) => void;
  onBoth: (columns: Column[], rows: Row[], control: string) => void;
}) {
  const [open, setOpen] = React.useState<string | null>(null);
  const sensors = useSortableSensors();
  const full = columns.length >= COMPARISON_LIMITS.columns;

  const update = (id: string, patch: Partial<Column>, field: string) =>
    onColumns(
      columns.map((column) => (column.id === id ? { ...column, ...patch } : column)),
      `col:${id}:${field}`,
    );

  const move = (from: number, to: number) => {
    if (to < 0 || to >= columns.length) return;
    onColumns(arrayMove(columns, from, to), step('col:move'));
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    move(
      columns.findIndex((column) => column.id === active.id),
      columns.findIndex((column) => column.id === over.id),
    );
  };

  const add = () => {
    if (full) return;
    const column = blankColumn(`Option ${columns.length + 1}`);
    onColumns([...columns, column], step('col:add'));
    setOpen(column.id);
  };

  const duplicate = (column: Column) => {
    if (full) return;
    const copy = { ...column, id: newComparisonId('col'), name: `${column.name} (copy)`.slice(0, 80) };
    const index = columns.findIndex((item) => item.id === column.id);
    const nextColumns = [...columns.slice(0, index + 1), copy, ...columns.slice(index + 1)];
    const nextRows = rows.map((row) =>
      row.cells[column.id] ? { ...row, cells: { ...row.cells, [copy.id]: row.cells[column.id]! } } : row,
    );
    onBoth(nextColumns, nextRows, step('col:duplicate'));
    setOpen(copy.id);
  };

  const remove = (column: Column) => {
    const nextRows = rows.map((row) => {
      if (!row.cells[column.id]) return row;
      const { [column.id]: _removed, ...cells } = row.cells;
      return { ...row, cells };
    });
    onBoth(
      columns.filter((item) => item.id !== column.id),
      nextRows,
      step('col:delete'),
    );
  };

  return (
    <section aria-labelledby={`${idPrefix}-columns-title`} className="rounded-xl border border-hairline">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-3 py-2.5">
        <div>
          <h4 id={`${idPrefix}-columns-title`} className="text-sm font-medium text-content">
            Columns
          </h4>
          <p className="text-xs text-muted">
            What is being compared. Drag to reorder. Up to {COMPARISON_LIMITS.columns}.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={add} disabled={full}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add column
        </Button>
      </header>

      {columns.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-muted">No columns yet. Add the first one.</p>
      ) : (
        <DndContext
          id={`${idPrefix}-columns`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={columns.map((column) => column.id)} strategy={verticalListSortingStrategy}>
            <ul className="divide-y divide-hairline">
              {columns.map((column, index) => (
                <SortableItem key={column.id} id={column.id} label={column.name || `Column ${index + 1}`}>
                  {(handle) => (
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {handle}
                        <button
                          type="button"
                          onClick={() => setOpen(open === column.id ? null : column.id)}
                          aria-expanded={open === column.id}
                          aria-controls={`${idPrefix}-col-${column.id}`}
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-muted/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-content">
                            {column.name || <span className="text-muted">Untitled column</span>}
                          </span>
                          {column.highlight ? (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                              <Star className="h-3 w-3" aria-hidden="true" />
                              Highlighted
                            </span>
                          ) : null}
                          <ChevronDown
                            className={cn('h-4 w-4 shrink-0 text-muted transition-transform', open === column.id && 'rotate-180')}
                            aria-hidden="true"
                          />
                        </button>
                        <IconButton label={`Move ${column.name || 'column'} up`} onClick={() => move(index, index - 1)} disabled={index === 0}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton
                          label={`Move ${column.name || 'column'} down`}
                          onClick={() => move(index, index + 1)}
                          disabled={index === columns.length - 1}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton label={`Duplicate ${column.name || 'column'}`} onClick={() => duplicate(column)} disabled={full}>
                          <Copy className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton label={`Delete ${column.name || 'column'}`} onClick={() => remove(column)} tone="danger">
                          <Trash className="h-3.5 w-3.5" />
                        </IconButton>
                      </div>

                      {open === column.id ? (
                        <div id={`${idPrefix}-col-${column.id}`} className="cms-field-container mt-3 pb-2">
                          <div className="cms-field-grid">
                            <ColumnFields
                              column={column}
                              id={`${idPrefix}-col-${column.id}`}
                              onChange={(patch, field) => update(column.id, patch, field)}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </SortableItem>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}

function ColumnFields({
  column,
  id,
  onChange,
}: {
  column: Column;
  id: string;
  onChange: (patch: Partial<Column>, field: string) => void;
}) {
  const text = (field: keyof Column, label: string, props: { placeholder?: string; max?: number; hint?: string; full?: boolean } = {}) => (
    <div className={props.full ? 'cms-field--full' : 'cms-field--half'}>
      <Field label={label} htmlFor={`${id}-${field}`} hint={props.hint}>
        <Input
          id={`${id}-${field}`}
          value={String(column[field] ?? '')}
          maxLength={props.max}
          placeholder={props.placeholder}
          onChange={(event) => onChange({ [field]: event.target.value } as Partial<Column>, field)}
        />
      </Field>
    </div>
  );

  return (
    <>
      {text('name', 'Name', { placeholder: 'Google Workspace', max: 80 })}
      {text('subtitle', 'Subtitle', { placeholder: 'Business Starter', max: 160 })}
      <div className="cms-field--full">
        <Field label="Logo" hint="Optional. From the Media Library.">
          <MediaPicker
            value={column.logoId}
            onChange={(next) => onChange({ logoId: next }, 'logoId')}
            label={`${column.name || 'Column'} logo`}
          />
        </Field>
      </div>
      {column.logoId ? text('logoAlt', 'Logo alt text', { placeholder: 'Leave empty to use the library’s', max: 160, full: true }) : null}
      {text('price', 'Price', { placeholder: '$X.XX', max: 40 })}
      {text('priceNote', 'Price description', { placeholder: 'per user / month', max: 120 })}

      <div className="cms-field--full">
        <Switch
          checked={column.showCta}
          onChange={(next) => onChange({ showCta: next }, 'showCta')}
          label="Show button"
        />
      </div>
      {column.showCta ? (
        <>
          {text('ctaLabel', 'Button label', { placeholder: 'Get a quote', max: 40 })}
          <div className="cms-field--half">
            <Field label="Button link" htmlFor={`${id}-ctaUrl`}>
              <LinkInput
                id={`${id}-ctaUrl`}
                value={column.ctaUrl}
                onChange={(next) => onChange({ ctaUrl: next }, 'ctaUrl')}
              />
            </Field>
          </div>
        </>
      ) : null}

      <div className="cms-field--full">
        <Switch
          checked={column.highlight}
          onChange={(next) => onChange({ highlight: next }, 'highlight')}
          label="Highlight as recommended"
          hint="Drawn in the highlight colour, with a filled button."
        />
      </div>
      {column.highlight ? text('badge', 'Badge', { placeholder: 'Recommended', max: 30 }) : null}

      <div className="cms-field--half">
        <ColorInput
          id={`${id}-background`}
          label="Column background"
          value={column.background}
          onChange={(next) => onChange({ background: next }, 'background')}
        />
      </div>
      <div className="cms-field--half">
        <ColorInput
          id={`${id}-textColor`}
          label="Column text"
          value={column.textColor}
          onChange={(next) => onChange({ textColor: next }, 'textColor')}
        />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Rows and values
// ---------------------------------------------------------------------------

function RowsEditor({
  columns,
  rows,
  idPrefix,
  onRows,
}: {
  columns: Column[];
  rows: Row[];
  idPrefix: string;
  onRows: (next: Row[], control: string) => void;
}) {
  const [details, setDetails] = React.useState<string | null>(null);
  /** The row to focus after it is added, so typing can start straight away. */
  const [focusRow, setFocusRow] = React.useState<string | null>(null);
  const sensors = useSortableSensors();
  const full = rows.length >= COMPARISON_LIMITS.rows;

  React.useEffect(() => {
    if (!focusRow) return;
    document.getElementById(`${idPrefix}-row-${focusRow}-label`)?.focus();
    setFocusRow(null);
  }, [focusRow, idPrefix]);

  const update = (id: string, patch: Partial<Row>, control: string) =>
    onRows(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)), control);

  const setCell = (row: Row, columnId: string, cell: ComparisonCell) =>
    update(row.id, { cells: { ...row.cells, [columnId]: cell } }, `cell:${row.id}:${columnId}`);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= rows.length) return;
    onRows(arrayMove(rows, from, to), step('row:move'));
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    move(
      rows.findIndex((row) => row.id === active.id),
      rows.findIndex((row) => row.id === over.id),
    );
  };

  const add = (kind: Row['kind']) => {
    if (full) return;
    const row = blankRow(kind, '');
    if (kind === 'feature') {
      // New feature rows start as checkmarks: the most common comparison.
      row.cells = Object.fromEntries(columns.map((column) => [column.id, { ...EMPTY_CELL, type: 'check' as const }]));
    }
    onRows([...rows, row], step(`row:add-${kind}`));
    setFocusRow(row.id);
  };

  const duplicate = (row: Row, index: number) => {
    if (full) return;
    const copy: Row = {
      ...row,
      id: newComparisonId(row.kind === 'group' ? 'grp' : 'row'),
      label: row.label ? `${row.label} (copy)`.slice(0, 160) : '',
      cells: { ...row.cells },
    };
    onRows([...rows.slice(0, index + 1), copy, ...rows.slice(index + 1)], step('row:duplicate'));
    setFocusRow(copy.id);
  };

  const remove = (row: Row) => {
    onRows(rows.filter((item) => item.id !== row.id), step('row:delete'));
    if (details === row.id) setDetails(null);
  };

  const gridTemplate = `2rem minmax(12rem, 16rem) repeat(${Math.max(columns.length, 1)}, minmax(11.5rem, 1fr)) 7.5rem`;

  return (
    <section aria-labelledby={`${idPrefix}-rows-title`} className="rounded-xl border border-hairline">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-3 py-2.5">
        <div>
          <h4 id={`${idPrefix}-rows-title`} className="text-sm font-medium text-content">
            Rows and values
          </h4>
          <p className="text-xs text-muted">
            Each value has its own type. Groups are headings for the rows under them. Drag to
            reorder; the arrow keys move a grabbed row.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={() => add('group')} disabled={full}>
            <FolderPlus className="h-4 w-4" aria-hidden="true" />
            Add group
          </Button>
          <Button size="sm" onClick={() => add('feature')} disabled={full || columns.length === 0}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add row
          </Button>
        </div>
      </header>

      {columns.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-muted">Add a column first; rows hold a value for each one.</p>
      ) : (
        <div className="overflow-x-auto" role="region" aria-label="Rows and values" tabIndex={0}>
          <div className="min-w-max">
            <div
              className="grid items-end gap-2 border-b border-hairline bg-muted/[0.03] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted"
              style={{ gridTemplateColumns: gridTemplate }}
              aria-hidden="true"
            >
              <span />
              <span>Feature</span>
              {columns.map((column) => (
                <span key={column.id} className="truncate normal-case tracking-normal text-content">
                  {column.name || 'Untitled column'}
                </span>
              ))}
              <span className="text-right">Actions</span>
            </div>

            {rows.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted">No rows yet. Add a row or a group.</p>
            ) : (
              <DndContext
                id={`${idPrefix}-rows`}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}
              >
                <SortableContext items={rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
                  <ul className="divide-y divide-hairline">
                    {rows.map((row, index) => (
                      <SortableItem
                        key={row.id}
                        id={row.id}
                        label={row.label || (row.kind === 'group' ? 'Untitled group' : 'Untitled row')}
                      >
                        {(handle) => (
                          <div className={cn(row.hidden && 'opacity-55', row.kind === 'group' && 'bg-brand/[0.04]')}>
                            <div
                              className="grid items-start gap-2 px-3 py-2"
                              style={{ gridTemplateColumns: gridTemplate }}
                            >
                              <div className="pt-1.5">{handle}</div>

                              {row.kind === 'group' ? (
                                <div style={{ gridColumn: `span ${columns.length + 1}` }}>
                                  <Input
                                    id={`${idPrefix}-row-${row.id}-label`}
                                    value={row.label}
                                    maxLength={160}
                                    placeholder="Group name, e.g. Storage"
                                    aria-label="Group name"
                                    className="h-9 font-semibold uppercase tracking-wide"
                                    onChange={(event) => update(row.id, { label: event.target.value }, `row:${row.id}:label`)}
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className="space-y-1">
                                    <Input
                                      id={`${idPrefix}-row-${row.id}-label`}
                                      value={row.label}
                                      maxLength={160}
                                      placeholder="Feature name"
                                      aria-label="Feature name"
                                      className="h-9"
                                      onChange={(event) => update(row.id, { label: event.target.value }, `row:${row.id}:label`)}
                                    />
                                    {row.tooltip ? (
                                      <p className="flex items-center gap-1 truncate text-[11px] text-muted">
                                        <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
                                        <span className="truncate">{row.tooltip}</span>
                                      </p>
                                    ) : null}
                                  </div>
                                  {columns.map((column) => (
                                    <CellEditor
                                      key={column.id}
                                      id={`${idPrefix}-cell-${row.id}-${column.id}`}
                                      cell={readCell(row, column.id)}
                                      context={`${row.label || 'Row'} — ${column.name || 'column'}`}
                                      onChange={(cell) => setCell(row, column.id, cell)}
                                    />
                                  ))}
                                </>
                              )}

                              <div className="flex items-center justify-end gap-0.5 pt-0.5">
                                <IconButton
                                  label={details === row.id ? 'Close row details' : 'Row details'}
                                  onClick={() => setDetails(details === row.id ? null : row.id)}
                                  pressed={details === row.id}
                                >
                                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', details === row.id && 'rotate-180')} />
                                </IconButton>
                                <IconButton
                                  label={row.hidden ? `Show ${row.label || 'row'}` : `Hide ${row.label || 'row'}`}
                                  onClick={() => update(row.id, { hidden: !row.hidden }, step('row:hide'))}
                                  pressed={row.hidden}
                                >
                                  {row.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </IconButton>
                                <IconButton label={`Duplicate ${row.label || 'row'}`} onClick={() => duplicate(row, index)} disabled={full}>
                                  <Copy className="h-3.5 w-3.5" />
                                </IconButton>
                                <IconButton label={`Delete ${row.label || 'row'}`} onClick={() => remove(row)} tone="danger">
                                  <Trash className="h-3.5 w-3.5" />
                                </IconButton>
                              </div>
                            </div>

                            {details === row.id ? (
                              <div className="mx-3 mb-3 grid gap-3 rounded-lg border border-hairline bg-surface p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                                {row.kind === 'feature' ? (
                                  <Field
                                    label="Tooltip"
                                    htmlFor={`${idPrefix}-row-${row.id}-tooltip`}
                                    hint="Explains the feature in a small (i) beside its name."
                                  >
                                    <Textarea
                                      id={`${idPrefix}-row-${row.id}-tooltip`}
                                      rows={2}
                                      maxLength={400}
                                      value={row.tooltip}
                                      onChange={(event) => update(row.id, { tooltip: event.target.value }, `row:${row.id}:tooltip`)}
                                    />
                                  </Field>
                                ) : (
                                  <p className="text-xs text-muted">
                                    A group is a heading over the rows after it, up to the next group.
                                    Hiding it hides those rows too.
                                  </p>
                                )}
                                <div className="flex flex-wrap items-start gap-1.5 sm:flex-col">
                                  <Button size="sm" variant="outline" onClick={() => move(index, index - 1)} disabled={index === 0}>
                                    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                                    Move up
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => move(index, index + 1)} disabled={index === rows.length - 1}>
                                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                                    Move down
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </SortableItem>
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      )}

      {full ? (
        <p className="border-t border-hairline px-3 py-2 text-xs text-muted">
          This table has the most rows one table can hold ({COMPARISON_LIMITS.rows}). Split it into
          two tables to add more.
        </p>
      ) : null}
    </section>
  );
}

/** One value: its type, and the inputs that type needs. */
function CellEditor({
  id,
  cell,
  context,
  onChange,
}: {
  id: string;
  cell: ComparisonCell;
  /** "Row — column", for labels a screen reader reads out. */
  context: string;
  onChange: (cell: ComparisonCell) => void;
}) {
  const set = (patch: Partial<ComparisonCell>) => onChange({ ...cell, ...patch });
  const richRef = React.useRef<HTMLTextAreaElement>(null);
  const numberInvalid = cell.type === 'number' && cell.value.trim() !== '' && parseCellNumber(cell.value) === null;
  const Icon = cell.type === 'icon' ? resolveCmsIcon(cell.icon) : null;

  /** Wraps the selected text of a rich cell in a tag. */
  const wrap = (open: string, close: string) => {
    const element = richRef.current;
    if (!element) return;
    const { selectionStart: start, selectionEnd: end, value } = element;
    const selected = value.slice(start, end) || 'text';
    set({ value: `${value.slice(0, start)}${open}${selected}${close}${value.slice(end)}`.slice(0, 600) });
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + open.length, start + open.length + selected.length);
    });
  };

  return (
    <div className="space-y-1.5 rounded-lg border border-hairline bg-surface p-1.5">
      <Select
        id={`${id}-type`}
        value={cell.type}
        aria-label={`${context}: value type`}
        className="h-8 text-xs"
        onChange={(event) => set({ type: event.target.value as CellType })}
      >
        {CELL_TYPES.map((type) => (
          <option key={type} value={type}>
            {CELL_TYPE_LABELS[type]}
          </option>
        ))}
      </Select>

      {cell.type === 'text' ? (
        <>
          <Input
            id={`${id}-value`}
            value={cell.value}
            maxLength={600}
            placeholder="Value"
            aria-label={`${context}: text`}
            className="h-8 text-sm"
            onChange={(event) => set({ value: event.target.value })}
          />
          <Input
            value={cell.note}
            maxLength={120}
            placeholder="Small note (optional)"
            aria-label={`${context}: note`}
            className="h-8 text-xs"
            onChange={(event) => set({ note: event.target.value })}
          />
        </>
      ) : null}

      {cell.type === 'rich' ? (
        <>
          <div className="flex gap-1" role="toolbar" aria-label={`${context}: formatting`}>
            <IconButton label="Bold" onClick={() => wrap('<strong>', '</strong>')}>
              <Bold className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton label="Italic" onClick={() => wrap('<em>', '</em>')}>
              <Italic className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton label="Link" onClick={() => wrap('<a href="https://">', '</a>')}>
              <Link2 className="h-3.5 w-3.5" />
            </IconButton>
          </div>
          <Textarea
            ref={richRef}
            id={`${id}-value`}
            rows={2}
            maxLength={600}
            value={cell.value}
            aria-label={`${context}: rich text`}
            className="text-sm"
            onChange={(event) => set({ value: event.target.value })}
          />
          <p className="text-[11px] text-muted">Bold, italic and links only. Anything else is removed.</p>
        </>
      ) : null}

      {cell.type === 'check' || cell.type === 'cross' ? (
        <Input
          value={cell.note}
          maxLength={120}
          placeholder="Note (optional)"
          aria-label={`${context}: note`}
          className="h-8 text-xs"
          onChange={(event) => set({ note: event.target.value })}
        />
      ) : null}

      {cell.type === 'icon' ? (
        <>
          <div className="flex items-center gap-1.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
              {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
            </span>
            <Select
              value={cell.icon}
              aria-label={`${context}: icon`}
              className="h-8 text-xs"
              onChange={(event) => set({ icon: event.target.value as ComparisonCell['icon'] })}
            >
              {CMS_ICON_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
          <Input
            value={cell.note}
            maxLength={120}
            placeholder="Label (optional)"
            aria-label={`${context}: icon label`}
            className="h-8 text-xs"
            onChange={(event) => set({ note: event.target.value })}
          />
        </>
      ) : null}

      {cell.type === 'number' ? (
        <>
          <div className="flex gap-1.5">
            <Input
              id={`${id}-value`}
              value={cell.value}
              inputMode="decimal"
              maxLength={40}
              placeholder="100"
              aria-label={`${context}: number`}
              aria-invalid={numberInvalid || undefined}
              className="h-8 min-w-0 text-sm"
              onChange={(event) => set({ value: event.target.value })}
            />
            <Input
              value={cell.note}
              maxLength={120}
              placeholder="Unit"
              aria-label={`${context}: unit`}
              className="h-8 w-20 shrink-0 text-xs"
              onChange={(event) => set({ note: event.target.value })}
            />
          </div>
          {numberInvalid ? (
            <p className="text-[11px] font-medium text-red-600" role="alert">
              Digits only, such as 1,000 or 2.5. Saved empty otherwise.
            </p>
          ) : null}
        </>
      ) : null}

      {cell.type === 'price' ? (
        <>
          <Input
            id={`${id}-value`}
            value={cell.value}
            maxLength={40}
            placeholder="$X.XX"
            aria-label={`${context}: price`}
            className="h-8 text-sm"
            onChange={(event) => set({ value: event.target.value })}
          />
          <Input
            value={cell.note}
            maxLength={120}
            placeholder="per user / month"
            aria-label={`${context}: price description`}
            className="h-8 text-xs"
            onChange={(event) => set({ note: event.target.value })}
          />
        </>
      ) : null}

      {cell.type === 'empty' ? <p className="px-1 py-1 text-xs text-muted">Shown as a dash.</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function useSortableSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

/** A sortable list item that hands its drag handle to its children. */
function SortableItem({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: (handle: React.ReactNode) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Drag to reorder ${label}`}
      className="flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted hover:bg-muted/10 hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:cursor-grabbing"
    >
      <GripVertical className="h-4 w-4" aria-hidden="true" />
    </button>
  );
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('relative bg-surface', isDragging && 'z-10 shadow-lg ring-1 ring-brand/30')}
    >
      {children(handle)}
    </li>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  pressed,
  tone,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  tone?: 'danger';
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors',
        'hover:bg-muted/10 hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        'disabled:pointer-events-none disabled:opacity-40',
        tone === 'danger' && 'hover:bg-red-50 hover:text-red-600',
        pressed && 'bg-muted/10 text-content',
      )}
    >
      {children}
    </button>
  );
}

/** The columns' logos, fetched through the action the media picker uses. */
function useLogos(ids: string[]): Map<string, ComparisonLogo> {
  const key = Array.from(new Set(ids)).sort().join(',');
  const [logos, setLogos] = React.useState<Map<string, ComparisonLogo>>(() => new Map());

  React.useEffect(() => {
    if (!key) {
      setLogos(new Map());
      return;
    }
    let cancelled = false;
    getMediaById(key.split(','))
      .then((rows) => {
        if (cancelled) return;
        setLogos(
          new Map(
            rows.map((row) => [
              row.id,
              { url: row.url, alt: row.altText ?? '', width: row.width, height: row.height },
            ]),
          ),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [key]);

  return logos;
}
