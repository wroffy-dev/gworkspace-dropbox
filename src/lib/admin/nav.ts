import type { PermissionKey } from '@/lib/auth/permissions';
import { SEED_FILES_PATH } from '@/lib/seed-files/routes';

/**
 * Admin information architecture — the one source of truth for the sidebar,
 * the breadcrumbs and the command palette's "Go to" list.
 *
 * Modules group the existing routes into the areas an admin actually thinks in
 * ("Website", "Leads & CRM") instead of one flat list. Nothing here creates a
 * route: every href points at a page that already exists, and where a screen
 * sits in the tree says nothing about where its route folder lives — Countries
 * is under Locations here and at /admin/settings/countries on disk.
 *
 * Nothing here grants access either. An item is shown only to someone holding
 * its permission, and every page still checks that permission on the server.
 */

export type AdminNavItem = {
  label: string;
  href: string;
  /** Any one of these grants access. */
  permission: PermissionKey | PermissionKey[];
  /** Shown in the command palette and as the icon-only tooltip subtitle. */
  description?: string;
  /**
   * Match the path exactly instead of by prefix. The query string is not
   * compared, so a filtered list (`?q=`, `?from=`) stays active; a sibling that
   * shares the path is told apart with `notMatches` instead.
   */
  exact?: boolean;
  /**
   * Routes that belong to this item but do not share its href prefix, used for
   * active-state and breadcrumbs (e.g. the page preview under /admin/preview).
   */
  alsoMatches?: string[];
  /**
   * Sibling routes that must NOT mark this item active. An entry with a query
   * string excludes only that exact path carrying those parameters, which is
   * how Staff and Roles & Permissions share /admin/staff.
   */
  notMatches?: string[];
  /**
   * The href of another item in the same module that this one sits beneath,
   * for a third breadcrumb level (Content › Blog › Categories). The sidebar
   * stays two levels deep; this only shapes the trail.
   */
  parent?: string;
  /** The breadcrumb label when it differs from the sidebar's ("Categories"). */
  crumbLabel?: string;
  /** NavIcon key, for an item drawn as a top-level link (a `flat` module's). */
  icon?: string;
  /**
   * Hidden from everyone but a super admin, whatever their permissions say.
   *
   * For the few destinations that are not permission-gated at all, because the
   * permission could be granted to any role from the Staff screen and the
   * destination must not be delegable. `permission` stays required, and is
   * what a super admin's blanket access satisfies.
   */
  superAdminOnly?: boolean;
};

export type AdminNavModule = {
  id: string;
  label: string;
  icon: string;
  /** A group with an href and no items is a single destination (Dashboard). */
  href?: string;
  exact?: boolean;
  permission?: PermissionKey | PermissionKey[];
  items?: AdminNavItem[];
  /**
   * The sidebar heading this module sits under (WEBSITE, GROWTH…). Purely
   * visual: it groups modules for the eye and changes nothing about routes,
   * breadcrumbs or permissions.
   */
  section?: string;
  /**
   * Draw the items as top-level links under the section heading instead of a
   * collapsible group — for a module whose heading already says what it is.
   * The breadcrumb still reads "Locations › Cities".
   */
  flat?: boolean;
};

export const ADMIN_NAV: AdminNavModule[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    href: '/admin',
    exact: true,
    permission: 'dashboard.view',
  },
  {
    id: 'website',
    section: 'Website',
    label: 'Website',
    icon: 'layout',
    items: [
      {
        label: 'Pages',
        href: '/admin/pages',
        permission: 'pages.view',
        description: 'Build and publish website pages',
        notMatches: ['/admin/pages/categories'],
        // The full-screen preview of a page belongs to the page.
        alsoMatches: ['/admin/preview'],
      },
      {
        label: 'Page Categories',
        href: '/admin/pages/categories',
        permission: 'pages.view',
        description: 'Group pages into a nested structure',
      },
      {
        label: 'Navigation',
        href: '/admin/navigation',
        permission: 'navigation.manage',
        description: 'Header, footer and legal menus',
      },
      {
        label: 'Media',
        href: '/admin/media',
        permission: 'media.view',
        description: 'Images and files used across the site',
      },
      {
        label: 'Website Design',
        href: '/admin/settings/design',
        permission: 'settings.manage',
        description: 'Colours, typography, buttons and layout',
      },
    ],
  },
  {
    id: 'products',
    section: 'Website',
    label: 'Products',
    icon: 'package',
    items: [
      {
        label: 'All Products',
        href: '/admin/products',
        permission: 'products.view',
        description: 'Every product and plan',
        notMatches: [
          '/admin/products/categories',
          '/admin/products/brands',
          '/admin/products/order',
          '/admin/products/design',
          '/admin/products/trash',
        ],
      },
      {
        label: 'Categories',
        href: '/admin/products/categories',
        permission: 'products.view',
        description: 'Group products by category',
      },
      {
        label: 'Brands',
        href: '/admin/products/brands',
        permission: 'products.view',
        description: 'Group products by vendor',
      },
      {
        label: 'Featured & Ordering',
        href: '/admin/products/order',
        permission: 'products.view',
        description: 'Choose the order products appear in',
      },
      {
        label: 'Product Design',
        href: '/admin/products/design',
        permission: 'products.view',
        description: 'Card style, image sizes, page layout and type',
      },
      {
        label: 'Removed Products',
        href: '/admin/products/trash',
        permission: 'products.view',
        description: 'Restore something taken out of the catalogue',
      },
    ],
  },
  {
    id: 'content',
    section: 'Website',
    label: 'Content',
    icon: 'file',
    items: [
      {
        label: 'Blog',
        href: '/admin/blog',
        permission: 'blog.view',
        description: 'Write and publish articles',
        notMatches: [
          '/admin/blog/categories',
          '/admin/blog/tags',
          '/admin/blog/layout',
          '/admin/blog/design',
        ],
      },
      {
        label: 'Blog Categories',
        crumbLabel: 'Categories',
        parent: '/admin/blog',
        href: '/admin/blog/categories',
        permission: 'blog.view',
        description: 'Organise articles by topic',
      },
      {
        label: 'Blog Tags',
        crumbLabel: 'Tags',
        parent: '/admin/blog',
        href: '/admin/blog/tags',
        permission: 'blog.view',
        description: 'Rename, re-slug and clean up tags',
      },
      {
        label: 'Blog Layout',
        crumbLabel: 'Layout',
        parent: '/admin/blog',
        href: '/admin/blog/layout',
        permission: 'blog.view',
        description: 'Order the archive, article and sidebar',
      },
      {
        label: 'Blog Design',
        crumbLabel: 'Design',
        parent: '/admin/blog',
        href: '/admin/blog/design',
        permission: 'blog.view',
        description: 'Cards, colours, typography and widths',
      },
    ],
  },
  {
    id: 'crm',
    section: 'Customers',
    label: 'Leads & CRM',
    icon: 'inbox',
    items: [
      {
        label: 'CRM Dashboard',
        href: '/admin/crm',
        permission: 'leads.view',
        description: 'Lead performance for any date range',
      },
      {
        label: 'Leads',
        href: '/admin/leads',
        permission: 'leads.view',
        description: 'Every enquiry from the website',
      },
      {
        label: 'Pipeline',
        href: '/admin/pipeline',
        permission: 'leads.view',
        description: 'Drag leads between stages',
      },
      {
        label: 'Customers',
        href: '/admin/customers',
        permission: 'customers.view',
        description: 'Won leads and their products',
      },
      {
        label: 'Forms',
        href: '/admin/forms',
        permission: 'forms.view',
        description: 'Build the forms that capture leads',
        notMatches: ['/admin/forms/submissions'],
      },
      {
        label: 'Submissions',
        parent: '/admin/forms',
        href: '/admin/forms/submissions',
        permission: 'forms.view',
        description: 'Everything visitors have submitted',
      },
      {
        // Reading the notice needs only leads.view — the people who work leads
        // must see what those leads agreed to. It sits with the forms it is
        // shown beside; its permission did not move with it.
        label: 'Consent Notice',
        parent: '/admin/forms',
        href: '/admin/consent',
        permission: 'leads.view',
        description: 'Wording shown beside every public form',
      },
    ],
  },
  {
    id: 'marketing',
    section: 'Growth',
    label: 'Marketing',
    icon: 'megaphone',
    items: [
      {
        label: 'Popups',
        href: '/admin/popups',
        permission: 'marketing.manage',
        description: 'On-site popups and offers',
      },
      {
        label: 'Tracking & Pixels',
        href: '/admin/marketing',
        permission: 'marketing.manage',
        description: 'Analytics and advertising tags',
        notMatches: ['/admin/marketing/campaigns'],
      },
      {
        label: 'UTM Campaigns',
        href: '/admin/marketing/campaigns',
        permission: 'marketing.manage',
        description: 'Build tagged campaign links',
      },
      {
        label: 'Lead Magnets',
        href: '/admin/lead-magnets',
        permission: 'marketing.manage',
        description: 'Downloads offered in exchange for details',
      },
      {
        label: 'Campaign Attribution',
        href: '/admin/reports?view=attribution',
        permission: 'leads.view',
        description: 'Which campaigns produce leads',
      },
    ],
  },
  {
    id: 'seo',
    section: 'Growth',
    label: 'SEO',
    icon: 'search',
    items: [
      {
        label: 'SEO Settings',
        href: '/admin/seo',
        permission: 'seo.manage',
        description: 'Titles, social sharing and indexing',
      },
      {
        label: 'SEO Intelligence',
        href: '/admin/seo-intelligence',
        permission: 'seo.manage',
        description: 'SEO, AEO and GEO scores for every page',
      },
      {
        label: 'Slug & URL Manager',
        href: '/admin/slug-manager',
        permission: 'seo.manage',
        description: 'Addresses, URL patterns, redirects and URL health',
        // The old Redirects address forwards here, so it belongs here.
        alsoMatches: ['/admin/redirects'],
      },
    ],
  },
  {
    id: 'reports',
    section: 'Growth',
    label: 'Reports',
    icon: 'chart',
    items: [
      {
        label: 'Reports',
        href: '/admin/reports',
        permission: 'leads.view',
        description: 'Lead performance over time',
        exact: true,
        // Campaign Attribution is this route with ?view=attribution.
        notMatches: ['/admin/reports?view=attribution'],
      },
    ],
  },
  {
    id: 'locations',
    section: 'Locations',
    flat: true,
    label: 'Locations',
    icon: 'map-pin',
    items: [
      {
        label: 'Countries',
        href: '/admin/settings/countries',
        icon: 'globe',
        permission: 'settings.manage',
        description: 'Storefronts, URL prefixes, currencies and local contact details',
      },
      {
        label: 'Cities',
        href: '/admin/cities',
        icon: 'map-pin',
        permission: 'pages.view',
        description: 'Local address spaces inside each market, such as /delhi',
        notMatches: ['/admin/cities/generator'],
      },
      {
        label: 'City Page Generator',
        href: '/admin/cities/generator',
        icon: 'shuffle',
        permission: 'pages.create',
        description: 'Copy a page into many cities at once',
      },
    ],
  },
  {
    id: 'administration',
    section: 'Admin',
    label: 'Administration',
    icon: 'users',
    items: [
      {
        label: 'Staff',
        href: '/admin/staff',
        permission: 'staff.manage',
        description: 'People who can sign in',
        notMatches: ['/admin/staff?tab=roles'],
      },
      {
        label: 'Roles & Permissions',
        href: '/admin/staff?tab=roles',
        permission: 'staff.manage',
        description: 'What each role is allowed to do',
      },
      {
        label: 'Audit Log',
        href: '/admin/audit',
        permission: 'audit.view',
        description: 'Who changed what, and when',
      },
    ],
  },
  {
    id: 'system',
    section: 'Admin',
    label: 'System',
    icon: 'server',
    items: [
      {
        label: 'Recycle Bin',
        href: '/admin/trash',
        permission: 'pages.view',
        description: 'Restore a deleted page, article, category or brand',
      },
      {
        label: 'Backup & Restore',
        href: '/admin/settings/backups',
        permission: 'backup.view',
        description: 'Download, schedule and restore site backups',
      },
      {
        label: 'Seed Files',
        href: SEED_FILES_PATH,
        permission: 'settings.manage',
        description: 'Run individual database seed files',
        superAdminOnly: true,
        exact: true,
      },
    ],
  },
  {
    id: 'settings',
    section: 'Admin',
    label: 'Settings',
    icon: 'settings',
    items: [
      {
        label: 'Website Settings',
        href: '/admin/settings',
        permission: 'settings.manage',
        description: 'Name, contact details and branding',
        // Every other screen under /admin/settings lives in another module.
        notMatches: [
          '/admin/settings/email',
          '/admin/settings/design',
          '/admin/settings/countries',
          '/admin/settings/backups',
        ],
      },
      {
        label: 'Email Settings',
        href: '/admin/settings/email',
        permission: 'settings.manage',
        description: 'SMTP and notification templates',
      },
    ],
  },
];

/** Strips the query string so route matching compares paths only. */
function pathOf(href: string): string {
  const index = href.indexOf('?');
  return index === -1 ? href : href.slice(0, index);
}

/** The query string of an href, without the `?`. */
function queryOf(href: string): string {
  const index = href.indexOf('?');
  return index === -1 ? '' : href.slice(index + 1);
}

/** True when every parameter in `required` is present in `search` with that value. */
function hasParams(required: string, search: string): boolean {
  const current = new URLSearchParams(search);
  return Array.from(new URLSearchParams(required).entries()).every(
    ([key, value]) => current.get(key) === value,
  );
}

/**
 * True when the current route is `candidate`.
 *
 * A candidate with a query string names one exact path carrying those
 * parameters — other parameters may ride along (`?view=attribution&from=…`).
 * Without one it covers the path and everything beneath it, unless `exact`.
 */
function routeMatches(candidate: string, pathname: string, search: string, exact = false) {
  const path = pathOf(candidate);
  const query = queryOf(candidate);
  if (query) return pathname === path && hasParams(query, search);
  if (exact) return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** True when `pathname` (plus its query) should light this item up. */
export function isItemActive(
  item: AdminNavItem | AdminNavModule,
  pathname: string,
  search = '',
): boolean {
  if (!item.href) return false;
  if ('notMatches' in item && item.notMatches?.some((route) => routeMatches(route, pathname, search))) {
    return false;
  }
  if (routeMatches(item.href, pathname, search, item.exact)) return true;
  return 'alsoMatches' in item
    ? Boolean(item.alsoMatches?.some((route) => routeMatches(route, pathname, search)))
    : false;
}

export type VisibleModule = AdminNavModule & { items: AdminNavItem[] };

/**
 * Filters the tree down to what this user may actually reach.
 *
 * `isSuperAdmin` is passed separately from `can` rather than inferred from it.
 * A super admin's `can` returns true for everything, so it cannot tell a super
 * admin apart from a role that simply holds the permission — and a
 * `superAdminOnly` entry has to make exactly that distinction.
 */
export function visibleModules(
  can: (permission: PermissionKey) => boolean,
  isSuperAdmin = false,
): VisibleModule[] {
  return ADMIN_NAV.map((group) => ({
    ...group,
    items: (group.items ?? []).filter((item) => canReach(item, can, isSuperAdmin)),
  })).filter((group) =>
    group.href
      ? !group.permission || canReach({ permission: group.permission }, can)
      : group.items.length > 0,
  );
}

/**
 * The module and item that own the current route — for the breadcrumbs and for
 * which sidebar module opens.
 *
 * Detail and action routes (/admin/pages/abc, /admin/leads/new) resolve through
 * the same prefix match that lights their list item, so they need no entries of
 * their own and cannot land in a different module from the list they belong to.
 */
export function locateRoute(
  pathname: string,
  search = '',
): { group: AdminNavModule; item?: AdminNavItem } | null {
  for (const group of ADMIN_NAV) {
    if (group.href && isItemActive(group, pathname, search)) return { group };
    for (const item of group.items ?? []) {
      if (isItemActive(item, pathname, search)) return { group, item };
    }
  }
  return null;
}

/** The item a nested item sits beneath, for its middle breadcrumb. */
export function parentItem(group: AdminNavModule, item: AdminNavItem): AdminNavItem | null {
  if (!item.parent) return null;
  return group.items?.find((candidate) => candidate.href === item.parent) ?? null;
}

/** True when `can` allows at least one of an item's permissions. */
export function canReach(
  item: Pick<AdminNavItem, 'permission' | 'superAdminOnly'>,
  can: (permission: PermissionKey) => boolean,
  isSuperAdmin = false,
): boolean {
  if (item.superAdminOnly && !isSuperAdmin) return false;
  return Array.isArray(item.permission) ? item.permission.some(can) : can(item.permission);
}
