import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import {
  ADMIN_NAV,
  canReach,
  isItemActive,
  visibleModules,
  locateRoute,
  parentItem,
} from '@/lib/admin/nav';
import {
  countActiveFilters,
  hasActiveFilters,
  describeFilters,
  NON_FILTER_KEYS,
  type FilterDefinition,
} from '@/lib/admin/filters';
import { ALL_PERMISSIONS, type PermissionKey } from '@/lib/auth/permissions';

const allowAll = () => true;

const itemsOf = (id: string) => ADMIN_NAV.find((group) => group.id === id)!.items!;
const item = (href: string) =>
  ADMIN_NAV.flatMap((group) => group.items ?? []).find((candidate) => candidate.href === href)!;
/** Every item that would light up for this route — there must only ever be one. */
const activeItems = (pathname: string, search = '') =>
  ADMIN_NAV.flatMap((group) => group.items ?? [])
    .filter((candidate) => isItemActive(candidate, pathname, search))
    .map((candidate) => candidate.href);
const trail = (pathname: string, search = '') => {
  const located = locateRoute(pathname, search);
  if (!located) return null;
  const { group, item: owner } = located;
  const parent = owner ? parentItem(group, owner) : null;
  return [group.label, parent?.label, owner && (owner.crumbLabel ?? owner.label)]
    .filter(Boolean)
    .join(' > ');
};

describe('admin navigation', () => {
  it('groups every destination under a module', () => {
    for (const group of ADMIN_NAV) {
      expect(group.label, 'a module needs a label').toBeTruthy();
      expect(group.icon, `${group.label} needs an icon`).toBeTruthy();
      // A module is either a single destination or a list of them, never both.
      expect(Boolean(group.href) !== Boolean(group.items?.length)).toBe(true);
    }
  });

  it('lists the modules in the agreed order', () => {
    expect(ADMIN_NAV.map((group) => group.label)).toEqual([
      'Dashboard',
      'Website',
      'Products',
      'Content',
      'Leads & CRM',
      'Marketing',
      'SEO',
      'Reports',
      'Locations',
      'Administration',
      'System',
      'Settings',
    ]);
  });

  it('files every screen under the module that owns it', () => {
    const labels = (id: string) => itemsOf(id).map((entry) => entry.label);
    expect(labels('website')).toEqual([
      'Pages',
      'Page Categories',
      'Navigation',
      'Media',
      'Website Design',
    ]);
    expect(labels('products')).toEqual([
      'All Products',
      'Categories',
      'Brands',
      'Featured & Ordering',
      'Product Design',
      'Removed Products',
    ]);
    expect(labels('content')).toEqual([
      'Blog',
      'Blog Categories',
      'Blog Tags',
      'Blog Layout',
      'Blog Design',
    ]);
    expect(labels('crm')).toEqual([
      'CRM Dashboard',
      'Leads',
      'Pipeline',
      'Customers',
      'Forms',
      'Submissions',
      'Consent Notice',
    ]);
    expect(labels('marketing')).toEqual([
      'Popups',
      'Tracking & Pixels',
      'UTM Campaigns',
      'Lead Magnets',
      'Campaign Attribution',
    ]);
    expect(labels('seo')).toEqual(['SEO Settings', 'SEO Intelligence', 'Slug & URL Manager']);
    expect(labels('reports')).toEqual(['Reports']);
    expect(labels('locations')).toEqual(['Countries', 'Cities', 'City Page Generator']);
    expect(labels('administration')).toEqual(['Staff', 'Roles & Permissions', 'Audit Log']);
    expect(labels('system')).toEqual(['Recycle Bin', 'Backup & Restore', 'Seed Files']);
    expect(labels('settings')).toEqual(['Website Settings', 'Email Settings']);
  });

  it('lists each destination once', () => {
    const hrefs = ADMIN_NAV.flatMap((group) => group.items ?? []).map((entry) => entry.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  /**
   * Moving a screen to another module must not change who may open it. This is
   * the permission every item carried before the navigation was reorganised.
   */
  it('keeps every item on the permission it had before it moved', () => {
    const before: Record<string, string> = {
      '/admin/pages': 'pages.view',
      '/admin/pages/categories': 'pages.view',
      '/admin/navigation': 'navigation.manage',
      '/admin/media': 'media.view',
      '/admin/popups': 'marketing.manage',
      '/admin/settings/design': 'settings.manage',
      '/admin/trash': 'pages.view',
      '/admin/cities': 'pages.view',
      '/admin/cities/generator': 'pages.create',
      '/admin/products': 'products.view',
      '/admin/products/categories': 'products.view',
      '/admin/products/brands': 'products.view',
      '/admin/products/order': 'products.view',
      '/admin/products/design': 'products.view',
      '/admin/products/trash': 'products.view',
      '/admin/crm': 'leads.view',
      '/admin/leads': 'leads.view',
      '/admin/consent': 'leads.view',
      '/admin/pipeline': 'leads.view',
      '/admin/customers': 'customers.view',
      '/admin/forms': 'forms.view',
      '/admin/forms/submissions': 'forms.view',
      '/admin/blog': 'blog.view',
      '/admin/blog/layout': 'blog.view',
      '/admin/blog/design': 'blog.view',
      '/admin/blog/categories': 'blog.view',
      '/admin/blog/tags': 'blog.view',
      '/admin/seo': 'seo.manage',
      '/admin/seo-intelligence': 'seo.manage',
      '/admin/slug-manager': 'seo.manage',
      '/admin/marketing': 'marketing.manage',
      '/admin/marketing/campaigns': 'marketing.manage',
      '/admin/lead-magnets': 'marketing.manage',
      '/admin/reports?view=attribution': 'leads.view',
      '/admin/reports': 'leads.view',
      '/admin/audit': 'audit.view',
      '/admin/settings': 'settings.manage',
      '/admin/settings/countries': 'settings.manage',
      '/admin/settings/email': 'settings.manage',
      '/admin/staff': 'staff.manage',
      '/admin/staff?tab=roles': 'staff.manage',
      '/admin/settings/backups': 'backup.view',
      '/seed-files': 'settings.manage',
    };
    const now = Object.fromEntries(
      ADMIN_NAV.flatMap((group) => group.items ?? []).map((entry) => [entry.href, entry.permission]),
    );
    expect(now).toEqual(before);
  });

  it('only references permissions that actually exist', () => {
    const known = new Set<string>(ALL_PERMISSIONS);
    for (const group of ADMIN_NAV) {
      for (const entry of group.items ?? []) {
        const keys = Array.isArray(entry.permission) ? entry.permission : [entry.permission];
        for (const key of keys) {
          expect(known.has(key), `${entry.label} references unknown permission ${key}`).toBe(true);
        }
      }
    }
  });

  it('only nests an item beneath a sibling in the same module', () => {
    for (const group of ADMIN_NAV) {
      for (const entry of group.items ?? []) {
        if (!entry.parent) continue;
        expect(parentItem(group, entry), `${entry.label} → ${entry.parent}`).not.toBeNull();
      }
    }
  });

  it('hides a module when the user cannot reach any of its items', () => {
    const salesOnly = (permission: PermissionKey) =>
      (['dashboard.view', 'leads.view', 'customers.view'] as string[]).includes(permission);
    const groups = visibleModules(salesOnly);
    const ids = groups.map((group) => group.id);

    expect(ids).toEqual(['dashboard', 'crm', 'marketing', 'reports']);

    const crm = groups.find((group) => group.id === 'crm')!;
    expect(crm.items.map((entry) => entry.label)).toEqual([
      'CRM Dashboard',
      'Leads',
      'Pipeline',
      'Customers',
      // Reading the consent notice needs only leads.view: the people who work
      // leads have to be able to see what those leads agreed to. Publishing a
      // new version needs leads.manageConsent, which this user lacks.
      'Consent Notice',
    ]);
    // Forms and Submissions need forms.view, which this user does not have.
    expect(crm.items.map((entry) => entry.label)).not.toContain('Forms');
    // Attribution is a leads report, so a sales user keeps it without marketing.manage.
    expect(groups.find((group) => group.id === 'marketing')!.items.map((e) => e.label)).toEqual([
      'Campaign Attribution',
    ]);
  });

  it('shows each restricted role only what it may open', () => {
    const holding = (...keys: string[]) => (permission: PermissionKey) => keys.includes(permission);
    const moduleIds = (can: (permission: PermissionKey) => boolean) =>
      visibleModules(can).map((group) => group.id);
    const hrefs = (can: (permission: PermissionKey) => boolean) =>
      visibleModules(can).flatMap((group) => group.items.map((entry) => entry.href));

    // Everything except SEO: no SEO module at all.
    const noSeo = (permission: PermissionKey) => permission !== 'seo.manage';
    expect(moduleIds(noSeo)).not.toContain('seo');

    // Everything except marketing: only the leads report is left in Marketing.
    const noMarketing = (permission: PermissionKey) => permission !== 'marketing.manage';
    expect(hrefs(noMarketing)).not.toContain('/admin/popups');
    expect(visibleModules(noMarketing).find((group) => group.id === 'marketing')!.items).toHaveLength(1);

    // Everything except staff: Administration keeps only the audit log.
    const noStaff = (permission: PermissionKey) => permission !== 'staff.manage';
    expect(visibleModules(noStaff).find((g) => g.id === 'administration')!.items.map((e) => e.label)).toEqual([
      'Audit Log',
    ]);
    // Neither staff nor audit: no Administration module.
    expect(moduleIds(holding('dashboard.view', 'pages.view'))).not.toContain('administration');

    // Everything except backups: System keeps the recycle bin, loses backups.
    const noBackup = (permission: PermissionKey) => permission !== 'backup.view';
    expect(hrefs(noBackup)).toContain('/admin/trash');
    expect(hrefs(noBackup)).not.toContain('/admin/settings/backups');

    // A content editor: pages and blog, and the bin they restore from.
    expect(moduleIds(holding('dashboard.view', 'pages.view', 'blog.view'))).toEqual([
      'dashboard',
      'website',
      'content',
      'locations',
      'system',
    ]);
    // Settings is reachable only with settings.manage — and Countries goes with it.
    expect(hrefs(holding('pages.view'))).not.toContain('/admin/settings/countries');
    expect(moduleIds(holding('pages.view'))).not.toContain('settings');
  });

  it('matches a detail route to its list item', () => {
    const leads = item('/admin/leads');
    expect(isItemActive(leads, '/admin/leads')).toBe(true);
    expect(isItemActive(leads, '/admin/leads/abc123')).toBe(true);
    expect(isItemActive(leads, '/admin/pipeline')).toBe(false);
  });

  it('keeps sibling routes from stealing each other’s active state', () => {
    const forms = item('/admin/forms');
    const submissions = item('/admin/forms/submissions');

    // Submissions lives under /admin/forms but must not light up Forms.
    expect(isItemActive(forms, '/admin/forms/submissions')).toBe(false);
    expect(isItemActive(submissions, '/admin/forms/submissions')).toBe(true);
    expect(isItemActive(forms, '/admin/forms/abc')).toBe(true);
  });

  it('separates two entries that share a route via the query string', () => {
    const attribution = item('/admin/reports?view=attribution');
    const reports = item('/admin/reports');

    expect(isItemActive(attribution, '/admin/reports', 'view=attribution')).toBe(true);
    expect(isItemActive(attribution, '/admin/reports', '')).toBe(false);
    expect(isItemActive(reports, '/admin/reports', '')).toBe(true);
    expect(isItemActive(reports, '/admin/reports', 'view=attribution')).toBe(false);
  });

  /**
   * Exactly one sidebar item lights up for every route — including the ones
   * that share a prefix or a path, and filtered lists carrying a query string.
   */
  it.each([
    ['/admin/pages', '', '/admin/pages'],
    ['/admin/pages/new', '', '/admin/pages'],
    ['/admin/pages/abc', '', '/admin/pages'],
    ['/admin/preview/abc', '', '/admin/pages'],
    ['/admin/pages/categories', '', '/admin/pages/categories'],
    ['/admin/pages/categories', 'q=help', '/admin/pages/categories'],
    ['/admin/products', 'q=plus', '/admin/products'],
    ['/admin/products/abc/layout', '', '/admin/products'],
    ['/admin/products/categories', '', '/admin/products/categories'],
    ['/admin/products/brands', '', '/admin/products/brands'],
    ['/admin/products/order', '', '/admin/products/order'],
    ['/admin/products/design', '', '/admin/products/design'],
    ['/admin/products/trash', '', '/admin/products/trash'],
    ['/admin/blog', '', '/admin/blog'],
    ['/admin/blog/abc/preview', '', '/admin/blog'],
    ['/admin/blog/categories', '', '/admin/blog/categories'],
    ['/admin/blog/tags', 'q=cloud', '/admin/blog/tags'],
    ['/admin/blog/layout', '', '/admin/blog/layout'],
    ['/admin/blog/design', '', '/admin/blog/design'],
    ['/admin/forms/new', '', '/admin/forms'],
    ['/admin/consent', '', '/admin/consent'],
    ['/admin/marketing', '', '/admin/marketing'],
    ['/admin/marketing/campaigns', '', '/admin/marketing/campaigns'],
    ['/admin/reports', '', '/admin/reports'],
    ['/admin/reports', 'from=2026-01-01&to=2026-02-01', '/admin/reports'],
    ['/admin/reports', 'view=attribution', '/admin/reports?view=attribution'],
    ['/admin/reports', 'view=attribution&from=2026-01-01', '/admin/reports?view=attribution'],
    ['/admin/seo', '', '/admin/seo'],
    ['/admin/seo-intelligence', '', '/admin/seo-intelligence'],
    ['/admin/seo-intelligence/page/abc', '', '/admin/seo-intelligence'],
    ['/admin/slug-manager', 'tab=redirects', '/admin/slug-manager'],
    ['/admin/redirects', '', '/admin/slug-manager'],
    ['/admin/settings/countries', '', '/admin/settings/countries'],
    ['/admin/cities', '', '/admin/cities'],
    ['/admin/cities/abc', '', '/admin/cities'],
    ['/admin/cities/generator', '', '/admin/cities/generator'],
    ['/admin/staff', '', '/admin/staff'],
    ['/admin/staff/abc', '', '/admin/staff'],
    ['/admin/staff', 'tab=roles', '/admin/staff?tab=roles'],
    ['/admin/audit', '', '/admin/audit'],
    ['/admin/trash', '', '/admin/trash'],
    ['/admin/settings/backups', '', '/admin/settings/backups'],
    ['/admin/settings', '', '/admin/settings'],
    ['/admin/settings/email', '', '/admin/settings/email'],
    ['/admin/settings/design', '', '/admin/settings/design'],
    ['/seed-files', '', '/seed-files'],
  ])('lights exactly one item for %s?%s', (pathname, search, expected) => {
    expect(activeItems(pathname, search)).toEqual([expected]);
  });

  it('keeps the dashboard exact so every admin route does not match it', () => {
    const dashboard = ADMIN_NAV.find((group) => group.id === 'dashboard')!;
    expect(isItemActive(dashboard, '/admin')).toBe(true);
    expect(isItemActive(dashboard, '/admin/leads')).toBe(false);
  });

  it('locates the module and item that own a route, for breadcrumbs', () => {
    expect(locateRoute('/admin/leads')).toMatchObject({
      group: { label: 'Leads & CRM' },
      item: { label: 'Leads' },
    });
    // A detail route resolves to its list item.
    expect(locateRoute('/admin/pages/abc')).toMatchObject({
      group: { label: 'Website' },
      item: { label: 'Pages' },
    });
    expect(locateRoute('/admin')).toMatchObject({ group: { label: 'Dashboard' } });
    expect(locateRoute('/admin/nowhere')).toBeNull();
  });

  it.each([
    ['/admin/pages', '', 'Website > Pages'],
    ['/admin/pages/categories', '', 'Website > Page Categories'],
    ['/admin/blog', '', 'Content > Blog'],
    ['/admin/blog/new', '', 'Content > Blog'],
    ['/admin/blog/categories', '', 'Content > Blog > Categories'],
    ['/admin/blog/tags', '', 'Content > Blog > Tags'],
    ['/admin/forms/submissions', '', 'Leads & CRM > Forms > Submissions'],
    ['/admin/consent', '', 'Leads & CRM > Forms > Consent Notice'],
    ['/admin/popups', '', 'Marketing > Popups'],
    ['/admin/seo-intelligence', '', 'SEO > SEO Intelligence'],
    ['/admin/seo-intelligence/page/abc', '', 'SEO > SEO Intelligence'],
    ['/admin/slug-manager', '', 'SEO > Slug & URL Manager'],
    ['/admin/settings/countries', '', 'Locations > Countries'],
    ['/admin/cities/new', '', 'Locations > Cities'],
    ['/admin/cities/generator', '', 'Locations > City Page Generator'],
    ['/admin/staff', '', 'Administration > Staff'],
    ['/admin/staff', 'tab=roles', 'Administration > Roles & Permissions'],
    ['/admin/audit', '', 'Administration > Audit Log'],
    ['/admin/settings/backups', '', 'System > Backup & Restore'],
    ['/admin/trash', '', 'System > Recycle Bin'],
    ['/admin/settings/email', '', 'Settings > Email Settings'],
  ])('builds the trail for %s?%s', (pathname, search, expected) => {
    expect(trail(pathname, search)).toBe(expected);
  });

  /**
   * No admin screen may fall out of the tree. Every page under src/app/admin
   * resolves to a module — the trail and the open sidebar module come from that
   * — except the profile, which is reached from the account menu on purpose.
   */
  it('leaves no admin page without a home in the navigation', () => {
    const root = 'src/app/admin';
    const pages: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name === 'page.tsx') pages.push(full);
      }
    };
    walk(root);
    expect(pages.length).toBeGreaterThan(50);

    const outsideNav = new Set(['/admin/profile']);
    for (const file of pages) {
      const route = `/${relative('src/app', file).split(sep).join('/')}`
        .replace(/\/page\.tsx$/, '')
        // A dynamic segment stands for any value; an id-shaped one will do.
        .replace(/\[[^\]]+\]/g, 'sample-id');
      if (outsideNav.has(route)) {
        expect(locateRoute(route), route).toBeNull();
        continue;
      }
      expect(locateRoute(route), `${route} is not owned by any module`).not.toBeNull();
    }
  });

  it('exposes every module to a super admin', () => {
    expect(visibleModules(allowAll).length).toBe(ADMIN_NAV.length);
  });

  /**
   * Seed Files is reachable by role, not by permission: `settings.manage` can
   * be granted to any role from the Staff screen, and running seed files
   * against the live database must not become delegable by ticking a box.
   */
  it('hides a super-admin-only item from everyone else, whatever they may do', () => {
    const forEveryone = visibleModules(allowAll).flatMap((group) => group.items);
    const forSuperAdmin = visibleModules(allowAll, true).flatMap((group) => group.items);

    expect(forEveryone.some((entry) => entry.href === '/seed-files')).toBe(false);
    expect(forSuperAdmin.some((entry) => entry.href === '/seed-files')).toBe(true);
    // And it is the only difference between the two.
    expect(forSuperAdmin.length).toBe(forEveryone.length + 1);
    expect(canReach(item('/seed-files'), allowAll, false)).toBe(false);
    expect(canReach(item('/seed-files'), allowAll, true)).toBe(true);
  });
});

describe('list filters', () => {
  const definitions: FilterDefinition[] = [
    { name: 'status', label: 'Status', options: [{ label: 'Qualified', value: 'QUALIFIED' }] },
    { name: 'source', label: 'Source', options: [{ label: 'Google', value: 'google' }] },
    { name: 'from', label: 'Date range', kind: 'date' },
  ];

  it('ignores paging and sorting when deciding whether filters are active', () => {
    expect(hasActiveFilters({ page: '3', sort: 'name', dir: 'asc' })).toBe(false);
    expect(hasActiveFilters({ status: 'QUALIFIED' })).toBe(true);
    expect(hasActiveFilters({})).toBe(false);
    for (const key of NON_FILTER_KEYS) {
      expect(hasActiveFilters({ [key]: 'x' })).toBe(false);
    }
  });

  it('counts a from/to pair as one date filter', () => {
    expect(countActiveFilters({ from: '2024-01-01', to: '2024-02-01' })).toBe(1);
    expect(countActiveFilters({ from: '2024-01-01' })).toBe(1);
    expect(countActiveFilters({ status: 'QUALIFIED', from: '2024-01-01', to: '2024-02-01' })).toBe(2);
    expect(countActiveFilters({ status: 'QUALIFIED', source: 'google', page: '2' })).toBe(2);
  });

  it('labels each chip with the option label rather than the raw value', () => {
    const chips = describeFilters({ status: 'QUALIFIED', source: 'google' }, definitions);
    expect(chips).toEqual([
      { name: 'status', label: 'Status', value: 'QUALIFIED', display: 'Qualified' },
      { name: 'source', label: 'Source', value: 'google', display: 'Google' },
    ]);
  });

  it('falls back to the raw value when an option has since disappeared', () => {
    const chips = describeFilters({ status: 'GONE' }, definitions);
    expect(chips[0]!.display).toBe('GONE');
  });

  it('leaves date filters to their own control instead of chipping them twice', () => {
    expect(describeFilters({ from: '2024-01-01' }, definitions)).toEqual([]);
  });
});
