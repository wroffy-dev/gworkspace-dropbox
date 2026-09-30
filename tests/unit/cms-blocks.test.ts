import { describe, it, expect } from 'vitest';
import {
  BLOCKS,
  BLOCK_LIST,
  BLOCK_PICKER_LIST,
  getBlock,
  parseBlockContent,
  blockDefaults,
  blocksForSurface,
  type ImageWidgetContent,
} from '@/lib/cms/blocks';
import {
  imageWidgetAlt,
  imageWidgetBorder,
  imageWidgetFrames,
  imageWidgetRadius,
  imageWidgetSizes,
  imageWidgetVars,
} from '@/lib/cms/image-widget';
import { googleFontsHref, fontStack, nearestWeight, findGoogleFont } from '@/lib/cms/google-fonts';
import { newField, starterFields, uniqueFieldName, EMPTY_FORM } from '@/lib/cms/form-model';

describe('block registry', () => {
  it('registers every section type the page builder offers', () => {
    for (const type of [
      'hero',
      'imageCards',
      'iconCards',
      'imageBox',
      'iconBox',
      'listSection',
      'headingText',
      'textListImage',
      'statistics',
      'productGrid',
      'faq',
      'cta',
    ]) {
      expect(getBlock(type), `missing block: ${type}`).not.toBeNull();
    }
  });

  it('keeps every block self-describing so the editor stays generic', () => {
    for (const block of BLOCK_LIST) {
      expect(block.type, 'block needs a type').toBeTruthy();
      expect(block.label, `${block.type} needs a label`).toBeTruthy();
      expect(block.fields.length, `${block.type} needs fields`).toBeGreaterThan(0);
      // Every block must produce valid defaults with no input at all.
      expect(() => blockDefaults(block.type)).not.toThrow();
    }
  });

  it('hides superseded blocks from the picker but still renders them', () => {
    expect(BLOCK_PICKER_LIST.some((b) => b.type === 'stats')).toBe(false);
    // The old block stays registered so existing pages keep working.
    expect(getBlock('stats')).not.toBeNull();
    expect(BLOCKS.stats!.supersededBy).toBe('statistics');
  });

  it('falls back to defaults rather than throwing on partial content', () => {
    const hero = parseBlockContent<{ heading: string; layout: string }>('hero', { heading: 'Hi' });
    expect(hero.heading).toBe('Hi');
    expect(hero.layout).toBe('content');

    const junk = parseBlockContent<{ layout: string }>('hero', { layout: 42 });
    expect(junk.layout).toBe('content');
  });

  it('keeps the hero form optional and never defaults to a specific form', () => {
    const hero = blockDefaults('hero');
    expect(hero.showForm).toBe(false);
    expect(hero.formSlug).toBe('');
    expect(hero.imageId).toBeNull();
  });

  it('offers every product source the product grid advertises', () => {
    const source = BLOCKS.productGrid!.fields.find((f) => f.name === 'source');
    expect(source?.kind).toBe('select');
    const values = source?.kind === 'select' ? source.options.map((o) => o.value) : [];
    expect(values).toEqual(
      expect.arrayContaining(['all', 'selected', 'featured', 'category', 'brand', 'latest']),
    );
  });
});

describe('google fonts', () => {
  it('requests only the families and weights actually chosen', () => {
    const href = googleFontsHref([
      { family: 'Inter', weights: [400, 700] },
      { family: 'Lora', weights: [500] },
    ]);
    expect(href).toContain('family=Inter:wght@400;700');
    expect(href).toContain('family=Lora:wght@500');
    // Nothing else from the catalogue is requested.
    expect(href).not.toContain('Poppins');
  });

  it('merges duplicate families into one request', () => {
    const href = googleFontsHref([
      { family: 'Inter', weights: [400] },
      { family: 'Inter', weights: [700] },
    ]);
    expect(href?.match(/family=Inter/g)?.length).toBe(1);
    expect(href).toContain('400;700');
  });

  it('skips a family that is not in the catalogue rather than guessing', () => {
    expect(googleFontsHref([{ family: 'Definitely Not A Font', weights: [400] }])).toBeNull();
    expect(googleFontsHref([])).toBeNull();
  });

  it('clamps a weight to one the family actually ships', () => {
    // Lora ships 400-700 only.
    expect(nearestWeight('Lora', 100)).toBe(400);
    expect(nearestWeight('Lora', 900)).toBe(700);
    expect(nearestWeight('Inter', 500)).toBe(500);
  });

  it('builds a font stack with a real fallback for the right category', () => {
    expect(fontStack('Lora')).toContain('Georgia');
    expect(fontStack('Inter')).toContain('system-ui');
    expect(fontStack('')).not.toContain("''");
  });

  it('never lets a font name break out of the CSS declaration', () => {
    const stack = fontStack('Evil"; } body { display:none } .x {');
    expect(stack).not.toContain('}');
    expect(stack).not.toContain('"');
    expect(stack).not.toContain(';');
  });

  it('resolves catalogue lookups case-insensitively', () => {
    expect(findGoogleFont('inter')?.family).toBe('Inter');
    expect(findGoogleFont('  DM Sans ')?.family).toBe('DM Sans');
    expect(findGoogleFont('nope')).toBeNull();
  });
});

describe('form builder model', () => {
  /*
   * These are plain values in a neutral module rather than exports of the
   * `'use client'` builder. That is what makes /admin/forms/new work: a Server
   * Component can spread EMPTY_FORM and call the factories directly.
   */
  it('produces a usable blank form', () => {
    expect(EMPTY_FORM.fields).toEqual([]);
    expect(EMPTY_FORM.isActive).toBe(true);
    expect(EMPTY_FORM.submitLabel).toBeTruthy();
  });

  it('builds the lead-mapped starter fields for a brand new form', () => {
    const fields = starterFields();
    expect(fields.map((f) => f.type)).toEqual(['NAME', 'EMAIL', 'PHONE', 'COMPANY']);
    expect(fields.filter((f) => f.isRequired).map((f) => f.type)).toEqual(['NAME', 'EMAIL']);
    expect(fields.every((f) => f.name)).toBe(true);
  });

  it('gives every field a unique React key', () => {
    const keys = [...starterFields(), newField('TEXT'), newField('TEXT')].map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('supports the newer field types', () => {
    expect(newField('URL').type).toBe('URL');
    expect(newField('DATE').type).toBe('DATE');
    // A consent box is required by default and spans the full width.
    const consent = newField('CONSENT');
    expect(consent.isRequired).toBe(true);
    expect(consent.width).toBe('full');
  });

  it('seeds options only for the field types that need them', () => {
    expect(newField('SELECT').options.length).toBe(1);
    expect(newField('RADIO').options.length).toBe(1);
    expect(newField('TEXT').options).toEqual([]);
  });

  it('keeps machine names unique when a field is duplicated', () => {
    const fields = [newField('TEXT')];
    fields[0]!.name = 'company';
    expect(uniqueFieldName('company', fields)).toBe('company_2');

    fields.push({ ...newField('TEXT'), name: 'company_2' });
    expect(uniqueFieldName('company', fields)).toBe('company_3');
  });
});

/**
 * A grid that can be set per screen size.
 *
 * `columns` alone only ever said what a wide screen gets; the narrower ones
 * stepped down on their own and the only way to say otherwise was the design
 * panel's Responsive tab, one section at a time. A block that offers a column
 * count now offers one for each width, with 0 meaning "narrow it for me".
 */
describe('per-breakpoint columns', () => {
  const gridBlocks = BLOCK_LIST.filter((block) =>
    block.fields.some((field) => field.name === 'columns'),
  );

  it('offers tablet and mobile beside every block’s own column count', () => {
    expect(gridBlocks.length).toBeGreaterThan(5);

    for (const block of gridBlocks) {
      const names = block.fields.map((field) => field.name);
      expect(names, `${block.type} should offer a tablet count`).toContain('tabletColumns');
      expect(names, `${block.type} should offer a mobile count`).toContain('mobileColumns');

      // And the schema has to hold what the editor collects.
      const defaults = blockDefaults(block.type);
      expect(defaults.tabletColumns, `${block.type} defaults`).toBe(0);
      expect(defaults.mobileColumns, `${block.type} defaults`).toBe(0);
    }
  });

  it('keeps a chosen count and refuses a nonsense one', () => {
    const chosen = parseBlockContent('productGrid', {
      columns: 4,
      tabletColumns: 3,
      mobileColumns: 2,
    }) as Record<string, unknown>;
    expect([chosen.columns, chosen.tabletColumns, chosen.mobileColumns]).toEqual([4, 3, 2]);

    const nonsense = parseBlockContent('productGrid', {
      mobileColumns: 'many',
    }) as Record<string, unknown>;
    expect(nonsense.mobileColumns).toBe(0);
  });
});


/**
 * One artwork, from either source.
 *
 * A block that shows a mark takes a picture or an icon, and the control that
 * sets it is one control — an "Image" field beside an "Icon" field is how a
 * block ends up with both set and nothing saying which one it draws.
 */
describe('artwork that may be an icon', () => {
  const paired = BLOCK_LIST.flatMap((block) => {
    const walk = (fields: typeof block.fields): Array<{ block: string; field: typeof fields[number] }> =>
      fields.flatMap((field) =>
        field.kind === 'repeater'
          ? walk(field.fields)
          : field.kind === 'media' && field.iconField
            ? [{ block: block.type, field }]
            : [],
      );
    return walk(block.fields);
  });

  it('offers the icon source on the blocks that draw a mark', () => {
    expect(paired.length).toBeGreaterThanOrEqual(5);
  });

  it('names a sibling the block can actually store an icon in', () => {
    for (const { block, field } of paired) {
      if (field.kind !== 'media') continue;
      const defaults = blockDefaults(block);
      const inRepeater = !(field.name in defaults);
      // A field inside a repeater is checked through its own item shape, which
      // the parse below exercises; a top-level one must be in the defaults.
      if (inRepeater) continue;
      expect(defaults, `${block}.${field.iconField}`).toHaveProperty(field.iconField!);
    }
  });

  it('keeps an icon name that was chosen', () => {
    const parsed = parseBlockContent('iconBox', { icon: 'rocket', imageId: null }) as Record<
      string,
      unknown
    >;
    expect(parsed.icon).toBe('rocket');
  });
});

describe('image widget', () => {
  const parse = (raw: unknown) => parseBlockContent<ImageWidgetContent>('imageWidget', raw);

  it('is a page block in the Cards & media group, and nowhere else', () => {
    const block = getBlock('imageWidget');
    expect(block?.label).toBe('Image');
    expect(block?.description).toBe('Display a fully configurable responsive image.');
    expect(block?.group).toBe('Cards & media');
    expect(block?.icon).toBe('image');
    expect(BLOCK_PICKER_LIST.some((b) => b.type === 'imageWidget')).toBe(true);
    expect(blocksForSurface('blogArticle').some((b) => b.type === 'imageWidget')).toBe(false);
    expect(blocksForSurface('blogListing').some((b) => b.type === 'imageWidget')).toBe(false);
  });

  it('starts empty, centred, full width and unlinked, with medium corners', () => {
    const defaults = blockDefaults('imageWidget') as ImageWidgetContent;
    expect(defaults).toMatchObject({
      imageId: null,
      imageAlt: '',
      imageTitle: '',
      caption: '',
      decorative: false,
      alignment: 'center',
      tabletAlignment: 'inherit',
      mobileAlignment: 'inherit',
      width: '100',
      tabletWidth: 'inherit',
      mobileWidth: '100',
      maxWidth: '',
      imageRatio: 'auto',
      imageFit: 'cover',
      imagePosition: 'center',
      linkUrl: '',
      openInNewTab: false,
      borderEnabled: false,
      borderColor: '',
      borderRadius: 'md',
      shadow: 'none',
      captionAlign: 'center',
    });
  });

  it('reads alt text saved under its first name', () => {
    expect(parse({ altText: 'A router on a desk' }).imageAlt).toBe('A router on a desk');
    // The current name wins when both are present.
    expect(parse({ altText: 'old', imageAlt: 'new' }).imageAlt).toBe('new');
    expect(parse({ altText: 'old' })).not.toHaveProperty('altText');
  });

  it('keeps only real lengths and colours, never raw CSS', () => {
    const parsed = parse({
      width: 'custom',
      customWidth: '70%',
      tabletCustomWidth: '40rem',
      mobileCustomWidth: '480',
      maxWidth: '100px;background:url(x)',
      customRadius: '-4px',
      borderWidth: 'calc(1px + 1px)',
      borderColor: 'red;} body{display:none',
    });
    expect(parsed.customWidth).toBe('70%');
    expect(parsed.tabletCustomWidth).toBe('40rem');
    expect(parsed.mobileCustomWidth).toBe('480px');
    expect(parsed.maxWidth).toBe('');
    expect(parsed.customRadius).toBe('');
    expect(parsed.borderWidth).toBe('');
    expect(parsed.borderColor).toBe('');
    // A length with a unit it does not know, or an expression, is dropped too.
    expect(parse({ maxWidth: '10ch' }).maxWidth).toBe('');
    expect(parse({ customWidth: 'min(100%, 4px)' }).customWidth).toBe('');
  });

  it('falls back per field rather than dropping the section', () => {
    const parsed = parse({
      imageId: 'media-1',
      alignment: 'diagonal',
      tabletAlignment: 'sideways',
      width: '42',
      imageRatio: '5/4',
      shadow: 'huge',
      borderRadius: 'blob',
    });
    expect(parsed.imageId).toBe('media-1');
    expect(parsed.alignment).toBe('center');
    expect(parsed.tabletAlignment).toBe('inherit');
    expect(parsed.width).toBe('100');
    expect(parsed.imageRatio).toBe('auto');
    expect(parsed.shadow).toBe('none');
    expect(parsed.borderRadius).toBe('md');
  });

  it('files every editor field under a group, in the editor’s order', () => {
    const groups = new Set(BLOCKS.imageWidget!.fields.map((field) => field.group));
    expect([...groups]).toEqual([
      'Image',
      'SEO & Accessibility',
      'Layout',
      'Responsive',
      'Link',
      'Appearance',
    ]);
    // Every field the schema stores has a control.
    const names = new Set(BLOCKS.imageWidget!.fields.map((field) => field.name));
    for (const key of Object.keys(blockDefaults('imageWidget'))) {
      expect(names.has(key), `${key} has no control`).toBe(true);
    }
  });
});

describe('image widget layout', () => {
  const parse = (raw: unknown) => parseBlockContent<ImageWidgetContent>('imageWidget', raw);

  it('inherits width and alignment downwards: desktop → tablet → mobile', () => {
    const frames = imageWidgetFrames(
      parse({ alignment: 'left', width: '50', tabletWidth: 'inherit', mobileWidth: 'inherit' }),
    );
    expect(frames.desktop).toMatchObject({ width: '50%', marginLeft: '0px', marginRight: 'auto' });
    expect(frames.tablet).toEqual(frames.desktop);
    expect(frames.mobile).toEqual(frames.desktop);
  });

  it('lets each screen size choose its own width and alignment', () => {
    const frames = imageWidgetFrames(
      parse({
        alignment: 'right',
        width: 'custom',
        customWidth: '480px',
        tabletAlignment: 'center',
        tabletWidth: '75',
        mobileAlignment: 'full',
        mobileWidth: '50',
        maxWidth: '960px',
      }),
    );
    expect(frames.desktop).toEqual({
      width: '480px',
      maxWidth: '960px',
      marginLeft: 'auto',
      marginRight: '0px',
      full: false,
    });
    expect(frames.tablet).toMatchObject({ width: '75%', marginLeft: 'auto', marginRight: 'auto' });
    // Full width ignores the width and the maximum on that screen only.
    expect(frames.mobile).toEqual({
      width: '100%',
      maxWidth: '100%',
      marginLeft: '0px',
      marginRight: '0px',
      full: true,
    });
  });

  it('keeps the larger screen’s width when a custom one is left blank', () => {
    const frames = imageWidgetFrames(parse({ width: '66', tabletWidth: 'custom', tabletCustomWidth: '' }));
    expect(frames.tablet.width).toBe('66.666%');
  });

  it('sizes "Auto" to the image’s own width', () => {
    expect(imageWidgetFrames(parse({ width: 'auto' }), 640).desktop.width).toBe('640px');
    expect(imageWidgetFrames(parse({ width: 'auto' }), null).desktop.width).toBe('100%');
  });

  it('writes one set of variables per screen size, and forces only full width', () => {
    const vars = imageWidgetVars(
      imageWidgetFrames(
        parse({ width: '25', tabletAlignment: 'full', mobileAlignment: 'left', mobileWidth: 'inherit' }),
      ),
    );
    expect(vars).toMatchObject({
      '--iw-w': '25%',
      '--iw-w-t': '100%',
      '--iw-fw-t': '100%',
      '--iw-w-m': '25%',
      '--iw-ml-m': '0px',
    });
    expect(vars).not.toHaveProperty('--iw-fw');
    expect(vars).not.toHaveProperty('--iw-fw-m');
  });

  it('asks the browser for a file near the size each screen draws', () => {
    const sizes = imageWidgetSizes(
      imageWidgetFrames(parse({ width: 'custom', customWidth: '30rem', tabletWidth: '50' })),
    );
    expect(sizes).toBe('(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 480px');
  });

  it('draws radii from the layout tokens, and borders only when switched on', () => {
    expect(imageWidgetRadius(parse({ borderRadius: 'none' }))).toBeUndefined();
    expect(imageWidgetRadius(parse({ borderRadius: 'md' }))).toContain('--layout-radius');
    expect(imageWidgetRadius(parse({ borderRadius: 'lg' }))).toContain('--layout-card-radius');
    expect(imageWidgetRadius(parse({ borderRadius: 'custom', customRadius: '24px' }))).toBe('24px');
    expect(imageWidgetBorder(parse({ borderWidth: '3px' }))).toEqual({});
    expect(imageWidgetBorder(parse({ borderEnabled: true }))).toMatchObject({
      borderWidth: '1px',
      borderStyle: 'solid',
    });
    expect(imageWidgetBorder(parse({ borderEnabled: true, borderColor: '#ff0000' })).borderColor).toBe(
      '#FF0000',
    );
  });

  it('takes alt text from the section, then the library, never the filename', () => {
    const library = { altText: 'Library alt' };
    expect(imageWidgetAlt(parse({ imageAlt: 'Own alt' }), library)).toBe('Own alt');
    expect(imageWidgetAlt(parse({ imageAlt: '  ' }), library)).toBe('Library alt');
    expect(imageWidgetAlt(parse({}), { altText: '' })).toBe('');
    expect(imageWidgetAlt(parse({}), null)).toBe('');
    expect(imageWidgetAlt(parse({ imageAlt: 'Own alt', decorative: true }), library)).toBe('');
  });
});
