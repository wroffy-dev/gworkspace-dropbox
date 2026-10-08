import type { ComparisonTableContent } from '@/lib/cms/comparison-table';
import { getMediaByIds } from '@/lib/services/media';
import type { BlockContext } from './shared';
import { ComparisonTableView, type ComparisonLogo } from './comparison-table-view';

/**
 * The comparison table section on the public site.
 *
 * Its only lookup is the column logos, in one batched query. There is no
 * product query anywhere on this path: the columns, rows and values are the
 * section's own content.
 */
export async function ComparisonTableBlock({
  content,
  ctx,
}: {
  content: ComparisonTableContent;
  ctx: BlockContext;
}) {
  const ids = content.columns
    .map((column) => column.logoId)
    .filter((id): id is string => Boolean(id));
  const media = ids.length > 0 ? await getMediaByIds(ids) : new Map();

  const logos = new Map<string, ComparisonLogo>();
  for (const [id, item] of media) {
    logos.set(id, { url: item.url, alt: item.altText, width: item.width, height: item.height });
  }

  return (
    <ComparisonTableView
      content={content}
      logos={logos}
      sectionId={ctx.sectionId}
      inverted={ctx.inverted}
      locale={ctx.country.locale || 'en'}
      preview={ctx.preview}
    />
  );
}
