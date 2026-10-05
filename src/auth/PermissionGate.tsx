import type { PropsWithChildren, ReactNode } from 'react';
import { useAuth } from './use-auth';

export function PermissionGate({
  permission,
  children,
  fallback = null,
}: PropsWithChildren<{
  permission: string;
  fallback?: ReactNode;
}>) {
  const { status, user } = useAuth();
  return status === 'authenticated' && user?.permissions.includes(permission) ? children : fallback;
}
