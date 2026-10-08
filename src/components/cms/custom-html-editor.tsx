'use client';

import * as React from 'react';
import { Monitor, Play, ShieldCheck, Smartphone, TriangleAlert } from 'lucide-react';
import {
  CUSTOM_HTML_LIMITS,
  customHtmlDocument,
  customHtmlElementId,
  type CustomHtmlContent,
} from '@/lib/cms/custom-html';
import { parseBlockContent } from '@/lib/cms/blocks';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { FieldList } from './field-renderer';
import { CustomHtmlFrame } from './blocks/custom-html-frame';
import type { ContentEditorProps } from './content-editors';

const TABS = [
  { id: 'html', label: 'HTML', placeholder: '<div class="my-widget">\n  <h3>Hello</h3>\n</div>' },
  { id: 'css', label: 'CSS', placeholder: '.my-widget {\n  padding: 1rem;\n}' },
  { id: 'js', label: 'JavaScript', placeholder: "document.querySelector('.my-widget h3').textContent = 'Hi!';" },
] as const;

type TabId = (typeof TABS)[number]['id'];

/**
 * The custom code section's Content tab: three code panes, how the code runs,
 * and a preview.
 *
 * The preview always runs isolated, whatever the section is set to — code
 * being written never runs inside the admin, where it would run as the
 * signed-in administrator. Inline sections are told so beside the preview.
 */
export function CustomHtmlEditor({ fields, values, onChange, onChangeMany, onChangeAs, idPrefix }: ContentEditorProps) {
  const content = React.useMemo(() => parseBlockContent<CustomHtmlContent>('customHtml', values), [values]);
  const [tab, setTab] = React.useState<TabId>('html');
  const [device, setDevice] = React.useState<'desktop' | 'mobile'>('desktop');
  /** What the preview is showing: refreshed after a pause in typing, or on Run. */
  const [previewDoc, setPreviewDoc] = React.useState(() => customHtmlDocument(content));
  const [autoRun, setAutoRun] = React.useState(true);

  const raw = (name: TabId) => (typeof values[name] === 'string' ? (values[name] as string) : '');
  const run = React.useCallback(() => setPreviewDoc(customHtmlDocument(content)), [content]);

  React.useEffect(() => {
    if (!autoRun) return;
    const timer = window.setTimeout(run, 700);
    return () => window.clearTimeout(timer);
  }, [autoRun, run]);

  const write = (name: TabId, value: string) => {
    if (onChangeAs) onChangeAs(`code:${name}`, { [name]: value });
    else onChange(name, value);
  };

  const sectionId = idPrefix.replace(/^c-/, '');
  const active = TABS.find((item) => item.id === tab)!;
  const value = raw(tab);
  const limit = CUSTOM_HTML_LIMITS[tab];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-hairline bg-muted/[0.04] px-3 py-2.5 text-xs text-muted">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
        <p>
          Code here runs on the public site. Only people with the <strong>Custom code</strong>{' '}
          permission can add or change it, and every change is recorded in the audit log.
        </p>
      </div>

      <section aria-label="Code" className="overflow-hidden rounded-xl border border-hairline">
        <div role="tablist" aria-label="Code language" className="flex gap-1 border-b border-hairline bg-muted/[0.03] px-2 pt-2">
          {TABS.map((item) => {
            const filled = raw(item.id).trim().length > 0;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`${idPrefix}-tab-${item.id}`}
                aria-selected={tab === item.id}
                aria-controls={`${idPrefix}-pane`}
                onClick={() => setTab(item.id)}
                className={cn(
                  '-mb-px inline-flex items-center gap-1.5 rounded-t-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                  tab === item.id ? 'border-hairline border-b-surface bg-surface text-content' : 'text-muted hover:text-content',
                )}
              >
                {item.label}
                {filled ? <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-label="has code" /> : null}
              </button>
            );
          })}
        </div>
        <div id={`${idPrefix}-pane`} role="tabpanel" aria-labelledby={`${idPrefix}-tab-${tab}`} className="bg-surface">
          <CodeArea
            key={tab}
            id={`${idPrefix}-${tab}`}
            label={`${active.label} code`}
            value={value}
            placeholder={active.placeholder}
            maxLength={limit}
            onChange={(next) => write(tab, next)}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline px-3 py-1.5 text-[11px] text-muted">
            <span>
              {tab === 'html'
                ? 'Full HTML, including <script> and <style> tags and third-party embed codes.'
                : tab === 'css'
                  ? 'Styles for this section’s code.'
                  : 'Runs after the HTML is on the page.'}{' '}
              Tab indents.
            </span>
            <span className={cn(value.length > limit * 0.9 && 'font-medium text-amber-600')}>
              {value.length.toLocaleString()} / {limit.toLocaleString()}
            </span>
          </div>
        </div>
      </section>

      <FieldList
        fields={fields}
        values={values}
        onChange={onChange}
        onChangeMany={onChangeMany}
        idPrefix={idPrefix}
        layout="container"
      />

      {content.mode === 'inline' ? (
        <div role="note" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <p>
              <strong>Inline code runs in the page itself</strong>, with full access to it, including
              for administrators who are signed in while they browse the site. Use it only for code
              you trust and that must change the page; embeds and widgets work isolated.
            </p>
            <p>
              Its CSS applies to the whole page. Scope it to this section with{' '}
              <code className="rounded bg-amber-100 px-1 font-mono">#{customHtmlElementId(sectionId)}</code>.
            </p>
          </div>
        </div>
      ) : null}

      <section aria-label="Preview" className="space-y-2 rounded-xl border border-hairline p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-content">Preview</h3>
            <p className="text-xs text-muted">
              Always runs isolated here, so code never runs inside the admin.
              {content.mode === 'inline' ? ' On the page it runs inline.' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <div role="group" aria-label="Preview width" className="flex gap-1 rounded-lg bg-muted/[0.08] p-1">
              {(
                [
                  ['desktop', 'Desktop', Monitor],
                  ['mobile', 'Mobile', Smartphone],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={device === id}
                  title={label}
                  onClick={() => setDevice(id)}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium',
                    device === id ? 'bg-surface text-content shadow-sm' : 'text-muted hover:text-content',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <label className="inline-flex items-center gap-1.5 text-xs text-muted">
              <input type="checkbox" checked={autoRun} onChange={(event) => setAutoRun(event.target.checked)} />
              Auto-run
            </label>
            <Button size="sm" variant="outline" onClick={run}>
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              Run
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-hairline bg-white">
          <div className="mx-auto transition-[width] duration-300" style={{ width: device === 'mobile' ? 'min(100%, 390px)' : '100%' }}>
            <CustomHtmlFrame
              srcDoc={previewDoc}
              title="Custom code preview"
              height={content.mode === 'isolated' ? content.height : 'auto'}
              fixedHeight={content.fixedHeight}
              lazy={false}
              className="ui-keep-white block w-full border-0"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

/** A plain code box: monospace, no spellcheck, and Tab indents instead of leaving. */
function CodeArea({
  id,
  label,
  value,
  placeholder,
  maxLength,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  maxLength: number;
  onChange: (next: string) => void;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab indents. Escape then Tab still leaves the box, so the keyboard is
    // never trapped in it.
    if (event.key !== 'Tab' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
    const element = event.currentTarget;
    if (element.dataset.escaped === 'true') {
      element.dataset.escaped = 'false';
      return;
    }
    event.preventDefault();
    const { selectionStart: start, selectionEnd: end } = element;
    const next = `${value.slice(0, start)}  ${value.slice(end)}`;
    if (next.length > maxLength) return;
    onChange(next);
    requestAnimationFrame(() => element.setSelectionRange(start + 2, start + 2));
  };

  return (
    <textarea
      ref={ref}
      id={id}
      aria-label={label}
      value={value}
      placeholder={placeholder}
      maxLength={maxLength}
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      rows={14}
      onKeyDown={(event) => {
        if (event.key === 'Escape') event.currentTarget.dataset.escaped = 'true';
        onKeyDown(event);
      }}
      onChange={(event) => onChange(event.target.value)}
      className="block min-h-[16rem] w-full resize-y border-0 bg-surface px-3 py-2.5 font-mono text-[13px] leading-relaxed text-content outline-none placeholder:text-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
    />
  );
}
