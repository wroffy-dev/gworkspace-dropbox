import type { PermissionKey } from '@/lib/auth/permissions';

/**
 * Blocks that need more than the surface's own edit permission.
 *
 * A custom code section runs whatever it is given on the public site, so
 * adding one, changing its content or copying it needs `pages.customCode` as
 * well as the right to edit the page or product it sits on. Moving, hiding,
 * restyling and deleting one do not: none of them changes what code runs.
 */
export const BLOCK_PERMISSIONS: Partial<Record<string, PermissionKey>> = {
  customHtml: 'pages.customCode',
};

export function permissionForBlock(blockType: string): PermissionKey | null {
  return BLOCK_PERMISSIONS[blockType] ?? null;
}

/** The parts of a signed-in user this needs: a role and its permissions. */
type Holder = { role: string | null; permissions: readonly string[] };

/**
 * Why `user` may not add, change or copy a section of `blockType`, or null
 * when they may. Pure, so the rule is tested without a session and the
 * actions call it directly.
 */
export function blockPermissionMessage(user: Holder, blockType: string): string | null {
  const needed = permissionForBlock(blockType);
  if (!needed || user.role === 'super-admin' || user.permissions.includes(needed)) return null;
  return 'Custom code sections need the “Add and edit custom code sections” permission. A Super Admin can grant it under Roles & permissions.';
}
