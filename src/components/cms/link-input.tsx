'use client';

import * as React from 'react';
import { ExternalLink, MousePointerClick } from 'lucide-react';
import { listPopupOptions, type PickerOption } from '@/lib/actions/pickers';
import { Input, Select } from '@/components/ui/field';
import { popupHref, popupIdFromHref } from '@/lib/cms/popup-link';
import { cn } from '@/lib/utils/cn';

/** One request for every link field on the screen, not one per field. */
let popupOptions: Promise<PickerOption[]> | null = null;
function loadPopupOptions() {
  popupOptions ??= listPopupOptions().catch(() => {
    popupOptions = null;
    return [];
  });
  return popupOptions;
}

/**
 * A link field that can also open a popup.
 *
 * "Go to a link" is the plain address input it always was. "Open a popup"
 * picks one of the site's popups and stores it as `#popup-<id>`, which the
 * public site opens on click — so the value is still just a link, and every
 * block, its validation and its renderer keep working unchanged.
 */
export function LinkInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const popupId = popupIdFromHref(value);
  const [mode, setMode] = React.useState<'link' | 'popup'>(popupId ? 'popup' : 'link');
  const [options, setOptions] = React.useState<PickerOption[] | null>(null);
  /** The address typed before switching to a popup, restored on switching back. */
  const lastLink = React.useRef(popupId ? '' : value);

  React.useEffect(() => {
    if (mode !== 'popup' || options) return;
    let live = true;
    loadPopupOptions().then((rows) => live && setOptions(rows));
    return () => {
      live = false;
    };
  }, [mode, options]);

  const choose = (next: 'link' | 'popup') => {
    if (next === mode) return;
    setMode(next);
    if (next === 'link') {
      onChange(lastLink.current);
    } else {
      lastLink.current = popupId ? lastLink.current : value;
      onChange('');
    }
  };

  const tab = (which: 'link' | 'popup', label: string, Icon: typeof ExternalLink) => (
    <button
      type="button"
      role="radio"
      aria-checked={mode === which}
      onClick={() => choose(which)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors',
        mode === which ? 'bg-surface text-content shadow-sm' : 'text-muted hover:text-content',
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );

  return (
    <div className="space-y-2">
      <div
        role="radiogroup"
        aria-label="What the link does"
        className="inline-flex gap-0.5 rounded-lg bg-muted/10 p-0.5"
      >
        {tab('link', 'Go to a link', ExternalLink)}
        {tab('popup', 'Open a popup', MousePointerClick)}
      </div>

      {mode === 'link' ? (
        <Input
          id={id}
          type="text"
          inputMode="url"
          value={value}
          placeholder={placeholder ?? '/contact'}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Select
          id={id}
          value={popupId ?? ''}
          onChange={(e) => onChange(e.target.value ? popupHref(e.target.value) : '')}
        >
          <option value="">{options ? 'Choose a popup…' : 'Loading popups…'}</option>
          {(options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
              {option.hint ? ` (${option.hint})` : ''}
            </option>
          ))}
          {popupId && options && !options.some((o) => o.value === popupId) ? (
            <option value={popupId}>Deleted popup</option>
          ) : null}
        </Select>
      )}
    </div>
  );
}
