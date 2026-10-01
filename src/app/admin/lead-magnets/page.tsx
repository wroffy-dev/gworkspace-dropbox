import type { Metadata } from 'next';
import { prisma } from '@/lib/db/prisma';
import { requirePermission, userCan } from '@/lib/auth/guards';
import {
  LeadMagnetManager,
  type LeadMagnetRow,
} from '@/components/admin/marketing/lead-magnet-manager';
import { StatCard } from '@/components/admin/stat-card';

export const metadata: Metadata = { title: 'Lead magnets' };
export const dynamic = 'force-dynamic';

export default async function LeadMagnetsAdmin() {
  const user = await requirePermission('marketing.manage');

  const [magnets, forms] = await Promise.all([
    prisma.leadMagnet.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { leads: true } } },
    }),
    prisma.form.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  const rows: LeadMagnetRow[] = magnets.map((magnet) => ({
    id: magnet.id,
    title: magnet.title,
    slug: magnet.slug,
    kind: magnet.kind,
    description: magnet.description,
    isActive: magnet.isActive,
    imageId: magnet.imageId,
    fileId: magnet.fileId,
    externalUrl: magnet.externalUrl,
    formId: magnet.formId,
    ctaLabel: magnet.ctaLabel,
    thankYouTitle: magnet.thankYouTitle,
    thankYouMessage: magnet.thankYouMessage,
    thankYouUrl: magnet.thankYouUrl,
    leadCount: magnet._count.leads,
  }));

  const live = rows.filter((row) => row.isActive).length;
  const captured = rows.reduce((sum, row) => sum + row.leadCount, 0);
  const best = rows.reduce<LeadMagnetRow | null>(
    (top, row) => (row.leadCount > (top?.leadCount ?? 0) ? row : top),
    null,
  );

  return (
    <div>
      <LeadMagnetManager
        title="Lead magnets"
        description="Downloads and offers exchanged for contact details. Place one with the Lead magnet block."
        summary={
          <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard label="Lead magnets" value={rows.length} icon="gift" />
            <StatCard label="Live" value={live} icon="check" tone={live > 0 ? 'success' : 'default'} />
            <StatCard label="Leads captured" value={captured} icon="inbox" tone="brand" />
            <StatCard
              label="Top performer"
              value={best ? best.leadCount : '—'}
              icon="trophy"
              hint={best ? best.title : 'No leads yet'}
            />
          </div>
        }
        rows={rows}
        forms={forms}
        canEdit={userCan(user, 'marketing.manage')}
      />
    </div>
  );
}
