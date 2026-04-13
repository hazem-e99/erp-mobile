export function hasPermission(user: any, permission: string): boolean {
  const permissions: string[] = user?.role?.permissions || [];
  if (!Array.isArray(permissions)) return false;
  if (permissions.includes('*')) return true;
  return permissions.includes(permission);
}

export function hasAnyPermission(user: any, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(user, p));
}
