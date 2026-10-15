import { z } from 'zod';
import { ApiError } from '@/services/api/api-error';

export function attendanceError(error: unknown) {
  if (error instanceof z.ZodError)
    return 'The response could not be validated. Check the record before retrying.';
  if (error instanceof ApiError) {
    const message =
      error.code === 'leave_policy_year_transition_unavailable'
        ? 'This leave-year change overlaps retained usage. The existing balance history must be reconciled before this transition can be used.'
        : error.status === 503
          ? 'This service or required database schema is unavailable.'
          : error.status === 409
            ? 'The record or preview changed. Reload and review before submitting again.'
            : error.status === 400
              ? 'Check the dates, required values and approved references.'
              : error.message;
    return message + (error.correlationId ? ` Reference: ${error.correlationId}` : '');
  }
  return 'The result is uncertain. Retry the unchanged action or reload and check the record.';
}
export function businessToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
