import { z } from 'zod';
import { normaliseLength } from './design';

/**
 * The custom code section: HTML, CSS and JavaScript written by hand.
 *
 * It is the one block whose content is code, so it is built around two
 * decisions:
 *
 * 1. **Who may write it.** Adding one, changing its code or copying it needs
 *    the `pages.customCode` permission as well as the page's own (see
 *    `block-permissions.ts`). Super Admin has it; every other role must be
 *    given it on purpose.
 *
 * 2. **Where it runs.** By default it runs *isolated*: in a sandboxed iframe
 *    with an opaque origin, which cannot read the site's cookies, storage or
 *    page, cannot call its actions and cannot reach a signed-in admin's
 *    session. It can still draw anything, load third-party embeds, open links
 *    and grow to its content's height. *Inline* runs it in the page itself,
 *    for code that must touch the page; that is a choice made per section,
 *    with a warning beside it.
 *
 * The admin editor previews both modes isolated, so code being written never
 * runs inside the admin.
 */

export const CUSTOM_HTML_LIMITS = {
  html: 100_000,
  css: 50_000,
  js: 50_000,
} as const;

const code = (max: number) => z.string().max(max).catch('').default('');

export const customHtmlSchema = z.object({
  html: code(CUSTOM_HTML_LIMITS.html),
  css: code(CUSTOM_HTML_LIMITS.css),
  js: code(CUSTOM_HTML_LIMITS.js),
  mode: z.enum(['isolated', 'inline']).catch('isolated').default('isolated'),
  /** Isolated only: grow with the content, or a fixed height. */
  height: z.enum(['auto', 'fixed']).catch('auto').default('auto'),
  fixedHeight: z
    .string()
    .max(16)
    .catch('')
    .default('')
    .transform((value) => {
      const length = normaliseLength(value);
      return length.startsWith('-') ? '' : length;
    }),
  /** Isolated only: the frame's accessible name. */
  title: z.string().max(120).catch('Embedded content').default('Embedded content'),
  /** Isolated only: wait until the frame is near the screen before loading it. */
  lazy: z.boolean().catch(true).default(true),
});

export type CustomHtmlContent = z.infer<typeof customHtmlSchema>;

// ---------------------------------------------------------------------------
// Isolated mode
// ---------------------------------------------------------------------------

/**
 * What the isolated frame may do.
 *
 * `allow-scripts` without `allow-same-origin` is the important pair: the code
 * runs, in an origin of its own. Links may navigate the page when clicked,
 * popups may open (and leave the sandbox, so a payment or booking window
 * works), and forms may submit.
 */
export const CUSTOM_HTML_SANDBOX =
  'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-modals';

/** The message the frame sends with its height. */
export const CUSTOM_HTML_HEIGHT_MESSAGE = 'cms-custom-html:height';
/**
 * The message the section sends to ask for it. A server-rendered frame can
 * load and report before the page's own script is listening, so the section
 * asks again once it is.
 */
export const CUSTOM_HTML_MEASURE_MESSAGE = 'cms-custom-html:measure';

/** Stops a string from closing the element it is written inside. */
function escapeClosing(source: string, tag: 'script' | 'style'): string {
  return source.replace(new RegExp(`</(${tag})`, 'gi'), '<\\/$1');
}

/**
 * The isolated frame's whole document, for `srcdoc`.
 *
 * The page's CSS goes in the head and its JavaScript at the end of the body,
 * after the HTML it works on, the way a hand-written page would put them. A
 * small script after both reports the document's height to the section, so
 * an "auto" frame is exactly as tall as what it shows. Links open in the page
 * rather than inside the frame.
 */
export function customHtmlDocument(content: Pick<CustomHtmlContent, 'html' | 'css' | 'js'>): string {
  const resizer = `(function(){var last=0;function send(){var h=Math.ceil(Math.max(document.documentElement.scrollHeight,document.body?document.body.scrollHeight:0));if(h!==last){last=h;parent.postMessage({type:'${CUSTOM_HTML_HEIGHT_MESSAGE}',height:h},'*');}}if(window.ResizeObserver){new ResizeObserver(send).observe(document.documentElement);}window.addEventListener('load',send);window.addEventListener('message',function(e){if(e.source===parent&&e.data&&e.data.type==='${CUSTOM_HTML_MEASURE_MESSAGE}'){last=0;send();}});setTimeout(send,300);send();})();`;
  return [
    '<!doctype html><html><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<base target="_top">',
    '<style>html,body{margin:0;padding:0}body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.5}img,video,iframe{max-width:100%}</style>',
    content.css ? `<style>${escapeClosing(content.css, 'style')}</style>` : '',
    '</head><body>',
    content.html,
    content.js ? `<script>${escapeClosing(content.js, 'script')}</script>` : '',
    `<script>${resizer}</script>`,
    '</body></html>',
  ].join('');
}

// ---------------------------------------------------------------------------
// Inline mode
// ---------------------------------------------------------------------------

export type InlineScript = {
  src: string;
  code: string;
  type: string;
  async: boolean;
  defer: boolean;
};

/**
 * Splits the `<script>` elements out of the HTML.
 *
 * Inline mode renders the HTML on the server, so the page arrives with its
 * markup in place. Scripts are lifted out first and run once the section has
 * mounted, so they run exactly once and run after client-side navigation too,
 * which scripts written into server HTML would not.
 */
export function extractScripts(html: string): { markup: string; scripts: InlineScript[] } {
  const scripts: InlineScript[] = [];
  const markup = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi, (_match, attrs: string, body: string) => {
    const attr = (name: string) => {
      const found = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(attrs);
      return found ? (found[1] ?? found[2] ?? found[3] ?? '') : '';
    };
    const flag = (name: string) => new RegExp(`\\b${name}\\b`, 'i').test(attrs);
    scripts.push({
      src: attr('src'),
      code: body,
      type: attr('type'),
      async: flag('async'),
      defer: flag('defer'),
    });
    return '';
  });
  return { markup, scripts };
}

/** A section's own DOM id for inline mode, so its CSS can be scoped to it. */
export function customHtmlElementId(sectionId: string): string {
  return `custom-code-${sectionId}`;
}
