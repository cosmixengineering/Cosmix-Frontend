import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { FileSpreadsheet, Search, RefreshCw } from 'lucide-react';
import { TextInput } from '@/components/forms/TextInput';
import { SelectInput } from '@/components/forms/SelectInput';
import { Button } from '@/components/ui/Button';
import { useHrAccess } from '../../hr/hooks/use-hr-access';
import { useHrLifetime } from '../../hr/hooks/use-hr-lifetime';
import { errorMessage } from '../../hr/utils/messages';
import { fetchReport, fetchReportTypes, exportReport } from '../api/reports-api';
import { exportFormatOptions, type ReportEnvelope } from '../schemas/report-contracts';

const permissions = { read: 'hr.reports.read', export: 'hr.reports.export' };

const reportLabels: Record<string, string> = {
  'daily-attendance': 'Daily Attendance',
  'monthly-attendance-register': 'Monthly Attendance Register',
  'punch-audit': 'Punch Audit Trail',
  'operational-zones': 'Operational Zones',
  'site-reporting': 'Site Reporting',
  'late-and-kpi': 'Late & KPI',
  overtime: 'Overtime',
  'meal-allowance': 'Meal Allowance',
  leave: 'Leave',
  'employee-master': 'Employee Master',
  'document-expiry': 'Document Expiry',
  'fuel-and-mileage': 'Fuel & Mileage',
  'payroll-handoff': 'Payroll Handoff',
  audit: 'Audit',
};

export function HrReportsPage() {
  const access = useHrAccess();
  if (!access.can(permissions.read)) {
    return (
      <section aria-label="HR reports">
        <div className="hr-page-heading">
          <p className="hr-kicker">HUMAN RESOURCES &bull; Analytics</p>
          <h1>Reports</h1>
        </div>
        <p className="hr-notice" role="alert">
          You do not hold the hr.reports.read permission.
        </p>
      </section>
    );
  }
  return <ReportWorkspace key={access.subject} canExport={access.can(permissions.export)} />;
}

function ReportWorkspace({ canExport }: { canExport: boolean }) {
  const lifetime = useHrLifetime();
  const [types, setTypes] = useState<string[]>([]);
  const [typesError, setTypesError] = useState<string | null>(null);
  const [reportType, setReportType] = useState('');
  const [filter, setFilter] = useState({
    from: '',
    to: '',
    date: '',
    year: '',
    month: '',
    siteId: '',
    departmentId: '',
    status: '',
    category: '',
    documentType: '',
    page: '1',
    pageSize: '100',
  });
  const [result, setResult] = useState<ReportEnvelope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState('2');
  const [exportReason, setExportReason] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const inFlight = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchReportTypes(controller.signal)
      .then((list) => setTypes(list))
      .catch((failure) => {
        if (!controller.signal.aborted) setTypesError(errorMessage(failure));
      });
    return () => controller.abort();
  }, [lifetime]);

  const columns = useMemo(() => {
    const first = result?.rows[0];
    return first ? Object.keys(first) : [];
  }, [result]);

  async function runPreview(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current || !reportType) return;
    const errors: Record<string, string> = {};
    if (filter.from && filter.to && filter.to < filter.from)
      errors.to = 'The end date cannot be before the start date.';
    if (filter.from && filter.to) {
      const days = (Date.parse(filter.to) - Date.parse(filter.from)) / 86400000;
      if (days > 366) errors.to = 'The date range cannot exceed 366 days.';
    }
    const page = Number(filter.page);
    const pageSize = Number(filter.pageSize);
    if (!Number.isInteger(page) || page < 1) errors.page = 'Enter a page number of 1 or more.';
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000)
      errors.pageSize = 'Page size must be between 1 and 1000.';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    setExportError(null);
    setExportSuccess(null);
    try {
      const data = await fetchReport(
        reportType,
        {
          from: filter.from || undefined,
          to: filter.to || undefined,
          date: filter.date || undefined,
          year: filter.year ? Number(filter.year) : undefined,
          month: filter.month ? Number(filter.month) : undefined,
          siteId: filter.siteId || undefined,
          departmentId: filter.departmentId || undefined,
          status: filter.status || undefined,
          category: filter.category || undefined,
          documentType: filter.documentType || undefined,
          page,
          pageSize,
        },
        lifetime(),
      );
      if (!lifetime().aborted) setResult(data);
    } catch (failure) {
      if (!lifetime().aborted) setError(errorMessage(failure));
    } finally {
      inFlight.current = false;
      if (!lifetime().aborted) setPending(false);
    }
  }

  async function runExport(event: FormEvent) {
    event.preventDefault();
    if (exporting || !reportType || !result) return;
    const errors: Record<string, string> = {};
    if (!exportReason.trim()) errors.reason = 'A reason is required for the audit record.';
    else if (exportReason.length > 1000)
      errors.reason = 'The reason must be at most 1000 characters.';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setExporting(true);
    setExportError(null);
    setExportSuccess(null);
    const signal = lifetime();
    try {
      const blob = await exportReport(
        reportType,
        Number(exportFormat),
        exportReason.trim(),
        {
          from: filter.from || undefined,
          to: filter.to || undefined,
          date: filter.date || undefined,
          year: filter.year ? Number(filter.year) : undefined,
          month: filter.month ? Number(filter.month) : undefined,
          siteId: filter.siteId || undefined,
          departmentId: filter.departmentId || undefined,
          status: filter.status || undefined,
          category: filter.category || undefined,
          documentType: filter.documentType || undefined,
          page: Number(filter.page),
          pageSize: Number(filter.pageSize),
        },
        signal,
      );
      if (signal.aborted) return;
      const extension = exportFormat === '1' ? 'csv' : 'xlsx';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}-${new Date().toISOString().slice(0, 10)}.${extension}`;
      link.rel = 'noopener';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportSuccess(
        `Exported ${result.metadata.totalCount} rows as ${extension.toUpperCase()}.`,
      );
      setExportReason('');
    } catch (failure) {
      if (!signal.aborted) setExportError(errorMessage(failure));
    } finally {
      if (!signal.aborted) setExporting(false);
    }
  }

  function set(key: keyof typeof filter) {
    return (event: { target: { value: string } }) =>
      setFilter((previous) => ({ ...previous, [key]: event.target.value }));
  }

  return (
    <section aria-label="HR reports">
      <div className="hr-page-heading">
        <p className="hr-kicker">HUMAN RESOURCES &bull; Analytics</p>
        <h1>Reports</h1>
      </div>
      <div className="hr-form-section">
        <h2>Report selection</h2>
        {typesError && (
          <div className="hr-notice" role="alert">
            <p>{typesError}</p>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </div>
        )}
        {!types.length && !typesError && (
          <p className="hr-notice" role="status">
            Loading report types...
          </p>
        )}
        {!!types.length && (
          <div className="hr-form-grid">
            <SelectInput
              label="Report"
              required
              value={reportType}
              onChange={(event) => {
                setReportType(event.target.value);
                setResult(null);
                setError(null);
              }}
              options={[
                { value: '', label: 'Choose a report' },
                ...types.map((type) => ({
                  value: type,
                  label: reportLabels[type] ?? type,
                })),
              ]}
            />
            <TextInput
              label="From"
              type="date"
              value={filter.from}
              error={fieldErrors.from}
              onChange={set('from')}
            />
            <TextInput
              label="To"
              type="date"
              value={filter.to}
              error={fieldErrors.to}
              onChange={set('to')}
            />
            <TextInput label="Single date" type="date" value={filter.date} onChange={set('date')} />
            <TextInput
              label="Year"
              type="number"
              min={2000}
              max={2100}
              value={filter.year}
              onChange={set('year')}
            />
            <TextInput
              label="Month"
              type="number"
              min={1}
              max={12}
              value={filter.month}
              onChange={set('month')}
            />
            <TextInput label="Site id" value={filter.siteId} onChange={set('siteId')} />
            <TextInput
              label="Department id"
              value={filter.departmentId}
              onChange={set('departmentId')}
            />
            <TextInput label="Status" value={filter.status} onChange={set('status')} />
            <TextInput label="Category" value={filter.category} onChange={set('category')} />
            <TextInput
              label="Document type"
              value={filter.documentType}
              onChange={set('documentType')}
            />
            <TextInput
              label="Page"
              required
              type="number"
              min={1}
              value={filter.page}
              error={fieldErrors.page}
              onChange={set('page')}
            />
            <TextInput
              label="Page size"
              required
              type="number"
              min={1}
              max={1000}
              value={filter.pageSize}
              error={fieldErrors.pageSize}
              onChange={set('pageSize')}
            />
          </div>
        )}
        <div className="hr-actions">
          <Button onClick={(event) => void runPreview(event)} disabled={pending || !reportType}>
            <Search size={16} />
            {pending ? 'Loading...' : 'Preview report'}
          </Button>
        </div>
        {error && (
          <div className="hr-notice" role="alert">
            <p>{error}</p>
            <Button variant="secondary" onClick={(event) => void runPreview(event)}>
              <RefreshCw size={14} /> Retry
            </Button>
          </div>
        )}
      </div>
      {result && (
        <>
          <div className="hr-form-section">
            <div className="hr-repeat-heading">
              <h2>{result.metadata.reportTitle}</h2>
              <span className="hr-status hr-status--neutral">
                {result.metadata.totalCount} rows &middot; {result.metadata.timeZone}
              </span>
            </div>
            <p className="muted">
              Generated {new Date(result.metadata.generatedAtUtc).toLocaleString()} &middot;{' '}
              {result.metadata.sourceLockStatus}
            </p>
            <div className="hr-table-wrap">
              <table className="hr-table">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, index) => (
                    <tr key={index}>
                      {columns.map((column) => (
                        <td key={column}>{formatCell(row[column])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!result.rows.length && (
              <p className="hr-notice" role="status">
                No rows for the current filters and scope.
              </p>
            )}
          </div>
          {canExport && (
            <div className="hr-form-section">
              <h2>Export</h2>
              <p className="muted">
                Exports are recorded with your reason for audit. A read-only grant cannot export.
              </p>
              <form onSubmit={(event) => void runExport(event)}>
                <div className="hr-form-grid">
                  <SelectInput
                    label="Format"
                    value={exportFormat}
                    onChange={(event) => setExportFormat(event.target.value)}
                    options={exportFormatOptions}
                  />
                </div>
                <label className="hr-field">
                  <span>Reason</span>
                  <textarea
                    rows={3}
                    required
                    maxLength={1000}
                    value={exportReason}
                    aria-invalid={Boolean(fieldErrors.reason)}
                    onChange={(event) => setExportReason(event.target.value)}
                  />
                  {fieldErrors.reason && <p className="field-error">{fieldErrors.reason}</p>}
                </label>
                {exportError && (
                  <p className="hr-message hr-message--error" role="alert">
                    {exportError}
                  </p>
                )}
                {exportSuccess && (
                  <p className="hr-message" role="status">
                    {exportSuccess}
                  </p>
                )}
                <div className="hr-actions">
                  <Button type="submit" disabled={exporting || !result.rows.length}>
                    <FileSpreadsheet size={16} />
                    {exporting ? 'Exporting...' : 'Export current view'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
