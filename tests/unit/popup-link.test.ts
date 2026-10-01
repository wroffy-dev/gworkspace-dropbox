import { describe, it, expect } from 'vitest';
import { popupHref, popupIdFromHref } from '@/lib/cms/popup-link';
import { safeUrl } from '@/lib/utils/sanitize';
import { countryHref } from '@/lib/country/routing';

describe('popup links', () => {
  it('round-trips a popup id', () => {
    expect(popupHref('cm123abc')).toBe('#popup-cm123abc');
    expect(popupIdFromHref(popupHref('cm123abc'))).toBe('cm123abc');
  });

  it('reads a popup on the end of a same-site path', () => {
    expect(popupIdFromHref('/pricing#popup-cm1')).toBe('cm1');
  });

  it('ignores ordinary links and anything that is not an id', () => {
    expect(popupIdFromHref('/contact')).toBeNull();
    expect(popupIdFromHref('#pricing')).toBeNull();
    expect(popupIdFromHref('')).toBeNull();
    expect(popupIdFromHref(null)).toBeNull();
    expect(popupIdFromHref('#popup-')).toBeNull();
    expect(popupIdFromHref('#popup-a b')).toBeNull();
    expect(popupIdFromHref('#popup-"><script>')).toBeNull();
    // Another site's anchor is that site's business.
    expect(popupIdFromHref('https://example.com/#popup-cm1')).toBeNull();
  });

  it('passes the link checks every button link goes through', () => {
    const href = popupHref('cm123abc');
    expect(safeUrl(href)).toBe(href);
    // An anchor is not an internal path, so no market prefix is added.
    expect(
      countryHref(
        { slug: 'ae', isDefault: false, prefixes: ['ae'] } as unknown as Parameters<typeof countryHref>[0],
        href,
      ),
    ).toBe(href);
  });
});
