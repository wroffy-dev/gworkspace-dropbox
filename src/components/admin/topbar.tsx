'use client';

import * as React from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import {
  PanelLeft,
  LogOut,
  ChevronDown,
  Plus,
  ExternalLink,
  User,
  UserCircle,
  ShieldCheck,
} from 'lucide-react';
import { initials } from '@/lib/utils/format';
import type { PermissionKey } from '@/lib/auth/permissions';
import { LOGIN_PATH } from '@/lib/auth/routes';
import { cn } from '@/lib/utils/cn';
import { AdminSearch } from './admin-search';
import { AdminBreadcrumbs } from './breadcrumbs';
import { AdminCountrySwitcher } from './country-switcher';
import { Menu, MenuItem, MenuSeparator } from '@/components/ui/menu';
import type { CountryContext } from '@/lib/country/types';

/** Create shortcuts, each gated by the permission its destination requires. */
const QUICK_CREATE: Array<{
  label: string;
  href: string;
  permission: PermissionKey;
}> = [
  { label: 'New page', href: '/admin/pages/new', permission: 'pages.create' },
  {
    label: 'New product',
    href: '/admin/products/new',
    permission: 'products.create',
  },
  { label: 'New form', href: '/admin/forms/new', permission: 'forms.create' },
  { label: 'New lead', href: '/admin/leads/new', permission: 'leads.create' },
  {
    label: 'New blog post',
    href: '/admin/blog/new',
    permission: 'blog.create',
  },
  { label: 'Upload media', href: '/admin/media', permission: 'media.upload' },
];

export function AdminTopbar({
  user,
  permissions,
  isSuperAdmin,
  country,
  countries,
  onOpenSidebar,
}: {
  user: { name: string; email: string; roleName: string; image?: string | null };
  permissions: string[];
  isSuperAdmin: boolean;
  /** The market the admin is currently editing. */
  country: Pick<CountryContext, 'id' | 'code' | 'name'>;
  /** Every market this user may switch to. */
  countries: Array<Pick<CountryContext, 'id' | 'code' | 'name' | 'isDefault'>>;
  onOpenSidebar: () => void;
}) {
  const can = (permission: PermissionKey) => isSuperAdmin || permissions.includes(permission);
  const createOptions = QUICK_CREATE.filter((option) => can(option.permission));

  return (
    // A floating glass bar: the strongest glass in the admin, so the page
    // scrolling underneath reads as depth rather than clutter. The <header>
    // itself is transparent and only spaces the bar from the window edge.
    // The strip around the floating bar fades into the workspace colour, so a
    // page scrolling underneath never shows through the gap above the bar.
    <header className="sticky top-0 z-topbar bg-gradient-to-b from-admin-workspace from-70% to-admin-workspace/0 px-2 pt-2 text-admin-nav sm:px-3 lg:pl-3 lg:pr-6 lg:pt-3">
      <div className="admin-glass-bar rounded-[20px]">
      <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open navigation"
          aria-controls="admin-sidebar"
          className="admin-focus admin-focus-header -ml-1 rounded-lg p-2 text-admin-nav/70 transition-colors hover:bg-admin-nav/[0.08] hover:text-admin-nav lg:hidden"
        >
          <PanelLeft className="h-5 w-5" />
        </button>

        {/* Breadcrumbs take the space on desktop; search owns it on mobile. */}
        <div className="hidden min-w-0 flex-1 lg:block">
          <AdminBreadcrumbs can={can} isSuperAdmin={isSuperAdmin} />
        </div>

        <div className="min-w-0 flex-1 lg:max-w-xs lg:flex-none">
          <AdminSearch permissions={permissions} isSuperAdmin={isSuperAdmin} />
        </div>

        <AdminCountrySwitcher current={country} countries={countries} />

        {createOptions.length > 0 ? (
          <Menu
            align="right"
            triggerClassName="admin-focus admin-focus-header"
            trigger={
              <span
                className={cn(
                  // The primary action: near-black, like every primary button
                  // in the admin; the brand colour stays an accent.
                  'inline-flex h-9 items-center gap-1.5 rounded-[var(--admin-radius-control)] px-3 text-sm font-medium',
                  'bg-[rgb(var(--admin-primary))] text-[rgb(var(--admin-primary-fg))] shadow-sm transition-colors',
                  'hover:bg-[rgb(var(--admin-primary))]/85',
                )}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Create</span>
                <ChevronDown
                  className="hidden h-3.5 w-3.5 opacity-80 sm:block"
                  aria-hidden="true"
                />
              </span>
            }
            label="Create new"
          >
            {createOptions.map((option) => (
              <MenuItem key={option.href} href={option.href}>
                {option.label}
              </MenuItem>
            ))}
          </Menu>
        ) : null}

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          title="View website"
          aria-label="View website (opens in a new tab)"
          className="admin-focus admin-focus-header hidden h-9 w-9 shrink-0 items-center justify-center rounded-[var(--admin-radius-control)] text-admin-nav/70 transition-colors hover:bg-admin-nav/[0.06] hover:text-admin-nav md:flex"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>

        <Menu
          align="right"
          label="Account menu"
          triggerClassName="admin-focus admin-focus-header"
          trigger={
            <span className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-admin-nav/[0.08]">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- storage URL, may be any host
                <img
                  src={user.image}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover ring-1 ring-admin-nav/20"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                  {initials(user.name)}
                </span>
              )}
              <span className="hidden text-left xl:block">
                <span className="block max-w-[9rem] truncate text-sm font-medium leading-tight text-admin-nav">
                  {user.name}
                </span>
                <span className="block text-xs leading-tight text-admin-nav/60">
                  {user.roleName}
                </span>
              </span>
              <ChevronDown
                className="hidden h-4 w-4 text-admin-nav/60 xl:block"
                aria-hidden="true"
              />
            </span>
          }
        >
          <div className="border-b border-hairline px-3 py-2.5">
            <p className="truncate text-sm font-medium text-content">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            <p className="mt-1 text-xs text-muted">{user.roleName}</p>
          </div>
          <MenuItem href="/admin/profile" icon={<UserCircle className="h-4 w-4" />}>
            My profile
          </MenuItem>
          <MenuItem href="/admin/profile?tab=security" icon={<ShieldCheck className="h-4 w-4" />}>
            Security
          </MenuItem>
          <MenuSeparator />
          <MenuItem href="/" external icon={<ExternalLink className="h-4 w-4" />}>
            View website
          </MenuItem>
          {isSuperAdmin || permissions.includes('staff.manage') ? (
            <MenuItem href="/admin/staff" icon={<User className="h-4 w-4" />}>
              Staff & roles
            </MenuItem>
          ) : null}
          <MenuSeparator />
          <MenuItem
            tone="danger"
            icon={<LogOut className="h-4 w-4" />}
            onClick={() => signOut({ callbackUrl: LOGIN_PATH })}
          >
            Sign out
          </MenuItem>
        </Menu>
      </div>

      {/* Breadcrumbs move below the bar on small screens so they stay readable. */}
      {/* `empty:hidden`: a screen with no trail (the dashboard) gets no strip. */}
      <div className="border-t border-admin-nav/10 px-4 py-2 empty:hidden lg:hidden">
        <AdminBreadcrumbs can={can} isSuperAdmin={isSuperAdmin} />
      </div>
      </div>
    </header>
  );
}
