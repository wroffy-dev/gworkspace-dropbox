import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { BLOCKS, blockDefaults, parseBlockContent } from '@/lib/cms/blocks';
import {
  CUSTOM_HTML_LIMITS,
  CUSTOM_HTML_SANDBOX,
  customHtmlDocument,
  extractScripts,
  type CustomHtmlContent,
} from '@/lib/cms/custom-html';
import { blockPermissionMessage, permissionForBlock } from '@/lib/cms/block-permissions';
import { SYSTEM_ROLES, ALL_PERMISSIONS } from '@/lib/auth/permissions';

const parse = (raw: unknown) => parseBlockContent<CustomHtmlContent>('customHtml', raw);

describe('custom code block', () => {
  it('is a Content block that starts empty and isolated', () => {
    expect(BLOCKS.customHtml!.group).toBe('Content');
    const content = blockDefaults('customHtml') as CustomHtmlContent;
    expect(content).toMatchObject({ html: '', css: '', js: '', mode: 'isolated', height: 'auto', lazy: true });
  });

  it('keeps the code exactly as written, within its limits', () => {
    const html = '<div onclick="go()">Hi</div><script src="https://x.test/a.js"></script>';
    expect(parse({ html }).html).toBe(html);
    expect(parse({ js: 'x'.repeat(CUSTOM_HTML_LIMITS.js + 1) }).js).toBe('');
    expect(parse({ mode: 'everywhere' }).mode).toBe('isolated');
    expect(parse({ height: 'fixed', fixedHeight: '1px;}body{x' }).fixedHeight).toBe('');
    expect(parse({ fixedHeight: '480' }).fixedHeight).toBe('480px');
  });
});

describe('who may write it', () => {
  const user = (role: string, permissions: string[] = []) =>
    ({ role, permissions });

  it('needs the custom code permission, and only for this block', () => {
    expect(permissionForBlock('customHtml')).toBe('pages.customCode');
    expect(permissionForBlock('hero')).toBeNull();
    expect(blockPermissionMessage(user('editor', ['pages.edit']), 'customHtml')).toMatch(/permission/);
    expect(blockPermissionMessage(user('editor', ['pages.edit']), 'hero')).toBeNull();
    expect(blockPermissionMessage(user('editor', ['pages.edit', 'pages.customCode']), 'customHtml')).toBeNull();
    expect(blockPermissionMessage(user('super-admin'), 'customHtml')).toBeNull();
  });

  it('is given to no role by default except Super Admin', () => {
    expect(ALL_PERMISSIONS).toContain('pages.customCode');
    for (const role of SYSTEM_ROLES) {
      if (role.permissions === 'all') continue;
      expect(role.permissions, role.slug).not.toContain('pages.customCode');
    }
  });

  it('is checked by every action that adds, changes or copies a section', () => {
    for (const path of ['src/lib/actions/pages.ts', 'src/lib/actions/product-layout.ts']) {
      const source = readFileSync(path, 'utf8');
      // add, update (content) and duplicate
      expect(source.split('blockPermissionMessage(user').length - 1, path).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('isolated mode', () => {
  it('runs in an origin of its own', () => {
    expect(CUSTOM_HTML_SANDBOX).toContain('allow-scripts');
    expect(CUSTOM_HTML_SANDBOX).not.toContain('allow-same-origin');
    expect(CUSTOM_HTML_SANDBOX).not.toMatch(/allow-top-navigation(?!-by-user-activation)/);
  });

  it('builds a whole document, with code that cannot close its own element', () => {
    const doc = customHtmlDocument({
      html: '<p>Hi</p>',
      css: 'p{color:red}</style><b>',
      js: 'var s = "</script><img src=x>";',
    });
    expect(doc.startsWith('<!doctype html>')).toBe(true);
    expect(doc).toContain('<p>Hi</p>');
    expect(doc).toContain('<\\/style>');
    expect(doc).toContain('<\\/script>');
    expect(doc).toContain('cms-custom-html:height');
    // CSS in the head, the page's script after its markup.
    expect(doc.indexOf('p{color:red}')).toBeLessThan(doc.indexOf('<p>Hi</p>'));
    expect(doc.indexOf('<p>Hi</p>')).toBeLessThan(doc.indexOf('var s ='));
  });
});

describe('inline mode', () => {
  it('lifts scripts out of the markup, in order, keeping their attributes', () => {
    const { markup, scripts } = extractScripts(
      '<div id="w"></div><script src="https://cdn.test/a.js" async></script><p>x</p><script type="module">run()</script>',
    );
    expect(markup).toBe('<div id="w"></div><p>x</p>');
    expect(scripts).toEqual([
      { src: 'https://cdn.test/a.js', code: '', type: '', async: true, defer: false },
      { src: '', code: 'run()', type: 'module', async: false, defer: false },
    ]);
  });

  it('is never rewritten as if its code were a site path', () => {
    const renderer = readFileSync('src/components/cms/section-renderer.tsx', 'utf8');
    expect(renderer).toMatch(/blockType === 'customHtml' \? section\.content : localiseContent/);
  });
});
