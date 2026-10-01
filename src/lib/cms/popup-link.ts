/**
 * Links that open a popup instead of going somewhere.
 *
 * A popup is addressed as `#popup-<id>`. Being an ordinary in-page anchor it
 * survives every place a link can be typed — a section's button, a menu item,
 * the header's call to action, a rich-text link — through the same URL checks
 * as any other anchor, and `PopupHost` catches the click on the public site.
 * Pasted onto the end of an address (`/pricing#popup-…`) it opens the popup
 * when that page loads.
 */

export const POPUP_HREF_PREFIX = '#popup-';

export function popupHref(popupId: string): string {
  return `${POPUP_HREF_PREFIX}${popupId}`;
}

/** The popup a link opens, or null when it is an ordinary link. */
export function popupIdFromHref(href: string | null | undefined): string | null {
  if (!href) return null;
  const value = href.trim();
  const at = value.indexOf(POPUP_HREF_PREFIX);
  // Only a bare anchor, or one at the end of a same-site path, is a popup link.
  if (at < 0 || (at > 0 && !value.startsWith('/'))) return null;
  const id = value.slice(at + POPUP_HREF_PREFIX.length);
  return /^[A-Za-z0-9_-]{1,40}$/.test(id) ? id : null;
}
