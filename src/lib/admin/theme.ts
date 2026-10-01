/**
 * The admin's colour theme: light, dark, or whatever the operating system says.
 *
 * Only the admin has one. The choice lives in this browser's localStorage and
 * is applied as `data-admin-theme` on <html>, which the `.admin-ui` styles in
 * globals.css read — the public site never carries `.admin-ui`, so nothing a
 * visitor sees can change with it.
 */

export const ADMIN_THEMES = ['light', 'dark', 'system'] as const;
export type AdminThemePreference = (typeof ADMIN_THEMES)[number];
export type AdminTheme = 'light' | 'dark';

export const ADMIN_THEME_STORAGE_KEY = 'admin:theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Runs before the admin paints, inlined into the admin layout, so a reload in
 * dark mode never flashes light first. Plain ES5 and self-contained: it cannot
 * import anything and must not throw where storage is blocked.
 */
export const ADMIN_THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem('${ADMIN_THEME_STORAGE_KEY}')||'system';var d=p==='dark'||(p==='system'&&window.matchMedia('${DARK_QUERY}').matches);document.documentElement.setAttribute('data-admin-theme',d?'dark':'light');}catch(e){}})();`;

export function readThemePreference(): AdminThemePreference {
  try {
    const stored = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
    return (ADMIN_THEMES as readonly string[]).includes(stored ?? '')
      ? (stored as AdminThemePreference)
      : 'system';
  } catch {
    return 'system';
  }
}

export function resolveTheme(preference: AdminThemePreference): AdminTheme {
  if (preference !== 'system') return preference;
  return typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/** Applies and remembers a preference. */
export function applyThemePreference(preference: AdminThemePreference): AdminTheme {
  const theme = resolveTheme(preference);
  document.documentElement.setAttribute('data-admin-theme', theme);
  try {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, preference);
  } catch {
    // Private mode: the theme still applies, it just will not be remembered.
  }
  return theme;
}

export { DARK_QUERY as ADMIN_DARK_QUERY };
