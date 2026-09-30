'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { canReach, locateRoute, parentItem, type AdminNavItem } from '@/lib/admin/nav';
import type { PermissionKey } from '@/lib/auth/permissions';
import { cn } from '@/lib/utils/cn';

/**
 * Breadcrumbs derived from the navigation tree.
 *
 * Rendered only inside the admin's dark top bar, so the colours are the shell's
 * rather than the page's: muted white for the trail, full white for the page
 * you are on.
 *
 * Because the trail comes from ADMIN_NAV, a page never has to restate where it
 * lives — moving an item between modules updates every breadcrumb for free.
 * An item nested under another (Blog › Categories) gets that item as a middle
 * step, and a detail route (/admin/pages/abc) links back to its list. A step is
 * a link only when `can` allows its destination, so the trail never offers a
 * screen the user would be refused. `leaf` names the current record on a
 * detail route (a page title, a lead name).
 */
export function AdminBreadcrumbs({
  leaf,
  className,
  can,
  isSuperAdmin = false,
}: {
  leaf?: string;
  className?: string;
  /** Without it every step is shown as a link, as before. */
  can?: (permission: PermissionKey) => boolean;
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const located = locateRoute(pathname, searchParams.toString());

  if (!located) return null;

  const { group, item } = located;
  const reachable = (target: AdminNavItem) => !can || canReach(target, can, isSuperAdmin);

  const trail: Array<{ label: string; href?: string }> = [];
  if (group.href !== '/admin') trail.push({ label: group.label });
  if (item) {
    const parent = parentItem(group, item);
    if (parent) {
      trail.push({ label: parent.label, href: reachable(parent) ? parent.href : undefined });
    }
    // On the list itself the item is where you are; beneath it, it is the way back.
    const onIndex = !leaf && pathname === item.href.split('?')[0];
    trail.push({
      label: item.crumbLabel ?? item.label,
      href: onIndex || !reachable(item) ? undefined : item.href,
    });
  }
  if (leaf) trail.push({ label: leaf });

  if (trail.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-admin-nav/60">
        <li>
          <Link
            href="/admin"
            className="admin-focus admin-focus-header rounded transition-colors hover:text-admin-nav"
          >
            Admin
          </Link>
        </li>
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              <ChevronRight className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
              {/* A step with an href is somewhere else — on a detail route that
                  includes the last one, the list the record belongs to. */}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="admin-focus admin-focus-header truncate rounded transition-colors hover:text-admin-nav"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  {...(last ? { 'aria-current': 'page' as const } : {})}
                  className={cn('truncate', last && 'font-medium text-admin-nav')}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
