import {
  customHtmlDocument,
  customHtmlElementId,
  extractScripts,
  type CustomHtmlContent,
} from '@/lib/cms/custom-html';
import type { BlockContext } from './shared';
import { CustomHtmlFrame } from './custom-html-frame';
import { CustomHtmlScripts } from './custom-html-inline';

/**
 * A custom code section on the public site.
 *
 * Isolated (the default) draws a sandboxed frame. Inline renders the markup
 * into the page, its CSS in a style element and its scripts after mount;
 * the section's element has a stable id (`#custom-code-<section id>`) for
 * scoping that CSS.
 */
export function CustomHtmlBlock({ content, ctx }: { content: CustomHtmlContent; ctx: BlockContext }) {
  const empty = !content.html.trim() && !content.css.trim() && !content.js.trim();
  if (empty) {
    return ctx.preview ? (
      <p className="cms-custom-code__empty">This custom code section is empty.</p>
    ) : null;
  }

  if (content.mode === 'isolated') {
    return (
      <div className="cms-custom-code">
        <CustomHtmlFrame
          srcDoc={customHtmlDocument(content)}
          title={content.title}
          height={content.height}
          fixedHeight={content.fixedHeight}
          lazy={content.lazy}
        />
      </div>
    );
  }

  const id = customHtmlElementId(ctx.sectionId);
  const { markup, scripts } = extractScripts(content.html);
  return (
    <div id={id} className="cms-custom-code cms-custom-code--inline">
      {content.css ? <style dangerouslySetInnerHTML={{ __html: content.css }} /> : null}
      <div dangerouslySetInnerHTML={{ __html: markup }} />
      {scripts.length > 0 || content.js.trim() ? (
        <CustomHtmlScripts scripts={scripts} js={content.js} targetId={id} />
      ) : null}
    </div>
  );
}
