import type { Metadata } from 'next';
import { Plus, Inbox } from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { requirePermission, userCan } from '@/lib/auth/guards';
import { AdminPageHeader } from '@/components/admin/page-header';
import { StatCard } from '@/components/admin/stat-card';
import { FormsTable, type FormRow } from '@/components/admin/forms/forms-table';
import { Card } from '@/components/ui/card';
import { ButtonLink } from '@/components/ui/button';
import { getAdminCountryScope } from '@/lib/country/admin';

export const metadata: Metadata = { title: 'Forms' };
export const dynamic = 'force-dynamic';

export default async function FormsAdmin() {
  const user = await requirePermission('forms.view');

  const scope = await getAdminCountryScope();

  const rows = await prisma.form.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      createsLead: true,
      updatedAt: true,
      _count: { select: { fields: true, submissions: true, leads: true } },
      // Products whose CTA button opens this form, so the list shows where a
      // form is actually used before someone deactivates it.
      productCtas: { select: { name: true }, take: 2 },
      country: { select: { name: true } },
    },
  });

  const tableRows: FormRow[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    isActive: row.isActive,
    createsLead: row.createsLead,
    fieldCount: row._count.fields,
    submissionCount: row._count.submissions,
    leadCount: row._count.leads,
    productName: row.productCtas.map((product) => product.name).join(', ') || null,
    countryName: row.country?.name ?? null,
    updatedAt: row.updatedAt.toISOString(),
  }));

  const activeForms = tableRows.filter((row) => row.isActive).length;
  const submissionTotal = tableRows.reduce((sum, row) => sum + row.submissionCount, 0);
  const leadTotal = tableRows.reduce((sum, row) => sum + row.leadCount, 0);

  return (
    <>
      <AdminPageHeader
        title="Forms"
        description="Build the forms that capture leads. Every submission records the product, page and campaign it came from."
        crumbs={[{ label: 'Forms' }]}
        actions={
          userCan(user, 'forms.create') ? (
            <>
              <ButtonLink href="/admin/forms/submissions" variant="outline">
                <Inbox className="h-4 w-4" aria-hidden="true" />
                Submissions
              </ButtonLink>
              <ButtonLink href="/admin/forms/new">
                <Plus className="h-4 w-4" aria-hidden="true" />
                New form
              </ButtonLink>
            </>
          ) : null
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Forms" value={tableRows.length} icon="clipboard" />
        <StatCard
          label="Active"
          value={activeForms}
          icon="check"
          tone={activeForms > 0 ? 'success' : 'default'}
        />
        <StatCard
          label="Submissions"
          value={submissionTotal}
          icon="send"
          href="/admin/forms/submissions"
        />
        <StatCard label="Leads created" value={leadTotal} icon="inbox" tone="brand" href="/admin/leads" />
      </div>
      <Card>
        <FormsTable
          rows={tableRows}
          can={{
            edit: userCan(user, 'forms.edit'),
            create: userCan(user, 'forms.create'),
            delete: userCan(user, 'forms.delete'),
          }}
          showCountry={scope.canSwitch}
        />
      </Card>
    </>
  );
}
