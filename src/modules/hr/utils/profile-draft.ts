import { businessToday } from './calendar.ts';

type Source = { asOf: string } & (
  | { version: string; current: { recordId: string | null } }
  | { employeeVersion: string; latestRecordId: string | null; effective: { id: string } | null }
);

// A form's original values and concurrency token are one snapshot. Even if the
// employee version stays constant, a scheduled record can become effective.
export function profileDraftChanged(original: Source, latest: Source, today = businessToday()) {
  if (original.asOf !== latest.asOf || latest.asOf < today) return true;
  if ('version' in original && 'version' in latest) {
    return (
      original.version !== latest.version || original.current.recordId !== latest.current.recordId
    );
  }
  if ('employeeVersion' in original && 'employeeVersion' in latest) {
    return (
      original.employeeVersion !== latest.employeeVersion ||
      original.latestRecordId !== latest.latestRecordId ||
      original.effective?.id !== latest.effective?.id
    );
  }
  return true;
}
