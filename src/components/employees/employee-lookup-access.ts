import type { SessionUser } from '../../auth/types';

const operationalPermissions = new Set([
  'attendance.summaries.read',
  'attendance.exceptions.read',
  'attendance.corrections.review',
  'attendance.overtime.review',
  'attendance.leaves.team-calendar.read',
  'attendance.site-reports.read',
]);

export function employeeLookupSource(user: SessionUser | null): 'hr' | 'attendance' | null {
  if (!user?.account) return null;
  if (
    user.grants.some(
      (g) => g.permission === 'hr.employees.read' && g.scopeKind === 7 && g.targetId === null,
    )
  )
    return 'hr';
  return user.grants.some((g) => operationalPermissions.has(g.permission)) ? 'attendance' : null;
}
