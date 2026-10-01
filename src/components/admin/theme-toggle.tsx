'use client';

import * as React from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { Menu, MenuItem } from '@/components/ui/menu';
import {
  ADMIN_DARK_QUERY,
  applyThemePreference,
  readThemePreference,
  type AdminThemePreference,
} from '@/lib/admin/theme';
import { cn } from '@/lib/utils/cn';

const OPTIONS: Array<{ value: AdminThemePreference; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/** The stored preference, kept in step with the OS while "System" is chosen. */
function useAdminTheme() {
  const [preference, setPreference] = React.useState<AdminThemePreference>('system');
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setPreference(readThemePreference());
    setMounted(true);
  }, []);

  // While "System" is chosen, a change of OS appearance changes the admin too.
  React.useEffect(() => {
    if (preference !== 'system') return;
    const media = window.matchMedia(ADMIN_DARK_QUERY);
    const follow = () => applyThemePreference('system');
    media.addEventListener('change', follow);
    return () => media.removeEventListener('change', follow);
  }, [preference]);

  const choose = (next: AdminThemePreference) => {
    setPreference(next);
    applyThemePreference(next);
  };

  return { preference, mounted, choose };
}

/**
 * Light / Dark / System for the admin, in the topbar.
 *
 * The theme is already on <html> before this mounts (the layout's inline
 * script put it there), so this only reads the stored preference, follows the
 * operating system while "System" is chosen, and applies a new choice.
 */
export function ThemeToggle() {
  const { preference, mounted, choose } = useAdminTheme();

  // Before mount the stored choice is unknown; a neutral icon avoids a
  // hydration mismatch and the wrong icon flashing.
  const CurrentIcon = mounted ? (OPTIONS.find((o) => o.value === preference)?.icon ?? Monitor) : Monitor;

  return (
    <Menu
      align="right"
      label="Theme"
      triggerClassName="admin-focus admin-focus-header"
      trigger={
        <span
          title="Theme"
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-[var(--admin-radius-control)]',
            'text-admin-nav/70 transition-colors hover:bg-admin-nav/[0.06] hover:text-admin-nav',
          )}
        >
          <CurrentIcon className="h-4 w-4" aria-hidden="true" />
        </span>
      }
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <MenuItem key={value} icon={<Icon className="h-4 w-4" />} onClick={() => choose(value)}>
          <span className="flex items-center justify-between gap-6">
            {label}
            {mounted && preference === value ? (
              <Check className="h-3.5 w-3.5 text-brand" aria-label="Selected" />
            ) : null}
          </span>
        </MenuItem>
      ))}
    </Menu>
  );
}

/**
 * The same three choices as account-menu items, for small screens where the
 * topbar has no room for the toggle beside the search.
 */
export function ThemeMenuItems({ className }: { className?: string }) {
  const { preference, mounted, choose } = useAdminTheme();
  return (
    <div className={className}>
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <MenuItem key={value} icon={<Icon className="h-4 w-4" />} onClick={() => choose(value)}>
          <span className="flex items-center justify-between gap-6">
            {label} theme
            {mounted && preference === value ? (
              <Check className="h-3.5 w-3.5 text-brand" aria-label="Selected" />
            ) : null}
          </span>
        </MenuItem>
      ))}
    </div>
  );
}

