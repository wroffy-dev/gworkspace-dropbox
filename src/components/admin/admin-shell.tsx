'use client';

import * as React from 'react';
import { SessionProvider } from 'next-auth/react';
import { AdminSidebar } from './sidebar';
import { AdminTopbar } from './topbar';
import { cn } from '@/lib/utils/cn';
import type { CountryContext } from '@/lib/country/types';

export type AdminTheme = 'light' | 'dark';

export function AdminShell({
  user,
  branding,
  country,
  countries,
  initialTheme,
  children,
}: {
  user: {
    name: string;
    email: string;
    roleName: string;
    permissions: string[];
    isSuperAdmin: boolean;
    image?: string | null;
  };
  branding: { siteName: string; logoUrl: string | null; logoDarkUrl: string | null };
  /** The market the admin is editing, resolved on the server. */
  country: Pick<CountryContext, 'id' | 'code' | 'name'>;
  /** Every market this user may switch to. */
  countries: Array<Pick<CountryContext, 'id' | 'code' | 'name' | 'isDefault'>>;
  initialTheme: AdminTheme;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [theme, setTheme] = React.useState<AdminTheme>(initialTheme);
  // Until the stored preference is read, render the default width so the
  // server and client markup agree and nothing flashes at a wrong size.
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem('admin:nav:collapsed') === '1');
    } catch {
      // No storage available — stay expanded.
    }
    setReady(true);
  }, []);

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem('admin:nav:collapsed', next ? '1' : '0');
      } catch {
        // Preference simply will not persist.
      }
      return next;
    });
  }, []);

  const isCollapsed = ready && collapsed;

  /*
   * The admin theme is scoped to `.admin-ui`. Dialogs, drawers and menus are
   * portalled to <body>, outside the shell's own element, so <body> carries
   * the class too while the admin is mounted — and gives it back when it
   * unmounts, so nothing of the admin's look reaches a public page.
   */
  React.useEffect(() => {
    document.body.classList.add('admin-ui');
    return () => {
      document.body.classList.remove('admin-ui', 'dark');
      delete document.body.dataset.adminTheme;
    };
  }, []);

  React.useEffect(() => {
    document.body.dataset.adminTheme = theme;
    document.body.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const changeTheme = React.useCallback((next: AdminTheme) => {
    setTheme(next);
    try {
      document.cookie = `admin-theme=${next}; path=/; max-age=31536000; samesite=lax`;
      window.localStorage.setItem('admin:theme', next);
    } catch {
      // Storage/cookies can be unavailable in hardened browsing modes; the
      // current session still updates immediately.
    }
  }, []);

  return (
    <SessionProvider>
      <div
        className={cn('admin-ui min-h-screen bg-admin-workspace', theme === 'dark' && 'dark')}
        data-admin-theme={theme}
      >
        <a href="#admin-main" className="skip-link">
          Skip to content
        </a>

        <AdminSidebar
          permissions={user.permissions}
          isSuperAdmin={user.isSuperAdmin}
          siteName={branding.siteName}
          logoUrl={branding.logoUrl}
          logoDarkUrl={branding.logoDarkUrl}
          theme={theme}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={isCollapsed}
          onToggleCollapsed={toggleCollapsed}
        />

        <div
          className={cn(
            'transition-[padding] duration-200 ease-out',
            // The rail floats 12px in from the edge, so the content clears its
            // width plus both gaps.
            isCollapsed ? 'lg:pl-[6.25rem]' : 'lg:pl-[17.5rem]',
          )}
        >
          <AdminTopbar
            user={{
              name: user.name,
              email: user.email,
              roleName: user.roleName,
            }}
            permissions={user.permissions}
            isSuperAdmin={user.isSuperAdmin}
            country={country}
            countries={countries}
            theme={theme}
            onThemeChange={changeTheme}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
          <main
            id="admin-main"
            className="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 sm:py-8 lg:pl-3"
          >
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
