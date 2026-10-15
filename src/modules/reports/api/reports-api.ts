import { z } from 'zod';
import { request } from '@/services/api/http-client';
import { queryString } from '../../hr/api/hr-api';
import {
  reportEnvelope,
  reportTypeList,
  reportQuery,
  type ReportFilter,
} from '../schemas/report-contracts';

export { queryString, reportQuery };

export async function fetchReportTypes(signal?: AbortSignal): Promise<string[]> {
  return reportTypeList.parse(await request('/hr/reports/types', { signal }));
}

export async function fetchReport(
  reportType: string,
  filter: ReportFilter,
  signal?: AbortSignal,
) {
  return reportEnvelope.parse(
    await request(`/hr/reports/${encodeURIComponent(reportType)}` + reportQuery(filter), {
      signal,
    }),
  );
}

// Export returns a file body (csv or xlsx), not JSON. The shared request helper already
// applies the session cookie and CSRF header; no idempotency key is required by this endpoint.
export async function exportReport(
  reportType: string,
  format: number,
  reason: string,
  filter: ReportFilter,
  signal: AbortSignal,
): Promise<Blob> {
  const body = await request(`/hr/reports/${encodeURIComponent(reportType)}/export`, {
    method: 'POST',
    body: { format, reason, filter },
    responseType: 'blob',
    signal,
  });
  if (!(body instanceof Blob)) throw new Error('Invalid export response.');
  return body;
}

export const reportExportRequestSchema = z.object({
  format: z.number().int().min(1).max(2),
  reason: z.string().min(1).max(1000),
});
