import type { Metadata } from 'next';
import { prisma } from '@/lib/db/prisma';
import { requirePermission, userCan } from '@/lib/auth/guards';
import { PopupManager, type PopupRow } from '@/components/admin/marketing/popup-manager';
import { StatCard } from '@/components/admin/stat-card';
import { getAdminCountryScope } from '@/lib/country/admin';

export const metadata: Metadata = { title: 'Popups' };
export const dynamic = 'force-dynamic';

export default async function PopupsAdmin() {
  const user = await requirePermission('marketing.manage');

  const [popups, forms, leadMagnets, scope] = await Promise.all([
    prisma.popup.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } }),
    prisma.form.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.leadMagnet.findMany({
      where: { deletedAt: null },
      orderBy: { title: 'asc' },
      select: { id: true, title: true },
    }),
    getAdminCountryScope(),
  ]);

  const rows: PopupRow[] = popups.map((popup) => ({
    id: popup.id,
    name: popup.name,
    type: popup.type,
    isActive: popup.isActive,
    trigger: popup.trigger,
    delaySeconds: popup.delaySeconds,
    scrollPercent: popup.scrollPercent,
    device: popup.device,
    frequencyDays: popup.frequencyDays,
    heading: popup.heading,
    body: popup.body,
    imageId: popup.imageId,
    formId: popup.formId,
    leadMagnetId: popup.leadMagnetId,
    ctaLabel: popup.ctaLabel,
    ctaUrl: popup.ctaUrl,
    startsAt: popup.startsAt?.toISOString() ?? null,
    endsAt: popup.endsAt?.toISOString() ?? null,
    urlPatterns: Array.isArray(popup.urlPatterns) ? (popup.urlPatterns as string[]) : [],
    countryId: popup.countryId,
  }));

  const now = Date.now();
  const live = popups.filter(
    (popup) =>
      popup.isActive &&
      (!popup.startsAt || popup.startsAt.getTime() <= now) &&
      (!popup.endsAt || popup.endsAt.getTime() >= now),
  ).length;
  const onClick = popups.filter((popup) => popup.trigger === 'CLICK').length;
  const scheduled = popups.filter(
    (popup) => popup.isActive && popup.startsAt && popup.startsAt.getTime() > now,
  ).length;

  return (
    <div>
      <PopupManager
        title="Popups"
        description="Timed, scroll and exit-intent popups, or ones that open from any button. Automatic popups are capped per visitor by their frequency setting."
        summary={
          <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard label="Total popups" value={popups.length} icon="megaphone" />
            <StatCard label="Live now" value={live} icon="check" tone={live > 0 ? 'success' : 'default'} />
            <StatCard
              label="Open from a button"
              value={onClick}
              icon="click"
              hint="Only when a button is clicked"
            />
            <StatCard label="Scheduled" value={scheduled} icon="clock" hint="Switched on, starting later" />
          </div>
        }
        rows={rows}
        forms={forms}
        countries={
          scope.canSwitch
            ? scope.countries.map((country) => ({ id: country.id, name: country.name }))
            : []
        }
        leadMagnets={leadMagnets}
        canEdit={userCan(user, 'marketing.manage')}
      />
    </div>
  );
}
