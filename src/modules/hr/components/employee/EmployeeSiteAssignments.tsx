import { useState } from 'react';
import { z } from 'zod';
import {
  History,
  MapPin,
  RefreshCw,
  Save,
  ChevronDown,
  ChevronUp,
  Building2,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { TextInput } from '@/components/forms/TextInput';
import { Pagination } from '@/components/data-display/Pagination';
import { EmployeeReference } from '@/components/employees/EmployeeReference';
import { useHrAccess } from '../../hooks/use-hr-access';
import { useHrQuery } from '../../hooks/use-hr-queries';
import { useDirtyForm } from '../../hooks/use-dirty-form';
import { id, pageOf, writeResult } from '../../schemas/contracts';
import { masterSchema } from '../../schemas/organization';
import {
  employeeAssignmentPageSchema,
  assignEmployeeSiteSchema,
  siteSchema,
  type EmployeeAssignmentPage,
} from '../../schemas/sites';
import { QueryState, Denied } from '../Feedback';
import { ReferenceField } from '../ReferenceField';
import { useSiteAction } from '../sites/use-site-action';

export interface EmployeeSiteAssignmentsProps {
  employeeId: string;
  onSaved?: (result: z.infer<typeof writeResult>) => void;
}
const read = ['hr.employees.read'];
const write = ['hr.employees.submissions.review', 'hr.employees.drafts.manage'];

export function EmployeeSiteAssignments(props: EmployeeSiteAssignmentsProps) {
  const access = useHrAccess();
  if (!id.safeParse(props.employeeId).success)
    return <p role="alert">Invalid employee reference.</p>;
  return (
    <AssignmentsWorkspace
      key={JSON.stringify([props.employeeId, access.subject, access.ready, access.user])}
      {...props}
    />
  );
}

function AssignmentsWorkspace({ employeeId, onSaved }: EmployeeSiteAssignmentsProps) {
  const access = useHrAccess();
  const [history, setHistory] = useState(false);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const query = useHrQuery(
    `employees/${employeeId}/assignments${history ? '/history' : ''}?page=${page}&pageSize=20`,
    employeeAssignmentPageSchema,
    read,
  );

  // Fetch Master Organization Entities to resolve UUIDs to Human Names
  const deptsQuery = useHrQuery('departments?pageSize=100', pageOf(masterSchema), [
    'hr.organization.read',
  ]);
  const desigsQuery = useHrQuery('designations?pageSize=100', pageOf(masterSchema), [
    'hr.organization.read',
  ]);
  const branchesQuery = useHrQuery('branches?pageSize=100', pageOf(masterSchema), [
    'hr.organization.read',
  ]);
  const staffCatsQuery = useHrQuery('staff-categories?pageSize=100', pageOf(masterSchema), [
    'hr.organization.read',
  ]);
  const empTypesQuery = useHrQuery('employment-types?pageSize=100', pageOf(masterSchema), [
    'hr.organization.read',
  ]);

  const toggleRow = (assignmentId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(assignmentId)) {
        next.delete(assignmentId);
      } else {
        next.add(assignmentId);
      }
      return next;
    });
  };

  if (!access.can(...read)) return <Denied />;

  const items = query.data?.assignments?.items ?? [];
  const totalCount = query.data?.assignments?.totalCount ?? 0;

  return (
    <div className="emp-card" style={{ marginBottom: '16px' }}>
      {/* Header matching other employee detail tabs */}
      <div className="emp-card-header">
        <div className="emp-card-title">
          <MapPin size={15} className="emp-card-title-icon" />
          <span>Site Assignments &amp; Work Locations</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="emp-card-edit-btn"
            disabled={editing || query.isFetching}
            onClick={() => void query.refetch()}
            title="Reload site assignments"
          >
            <RefreshCw size={11} className={query.isFetching ? 'spin' : ''} />
            <span>{query.isFetching ? 'Reloading...' : 'Reload'}</span>
          </button>
          {access.can(...write, 'hr.sites.read') && (
            <button
              type="button"
              className="emp-card-edit-btn"
              style={{
                background: '#0f172a',
                color: '#ffffff',
                borderColor: '#0f172a',
                padding: '4px 10px',
                fontWeight: 650,
              }}
              disabled={editing}
              onClick={() => setEditing(true)}
            >
              <Plus size={12} />
              <span>Assign / reassign site</span>
            </button>
          )}
        </div>
      </div>

      {/* Modern Assignment Sub-tabs */}
      <div className="emp-assignment-tabs">
        <button
          type="button"
          className={`emp-assignment-tab-btn ${!history ? 'active' : ''}`}
          disabled={editing}
          onClick={() => {
            setHistory(false);
            setPage(1);
          }}
        >
          <MapPin size={13} />
          <span>Current and scheduled</span>
          {!history && query.data && <span className="emp-tab-badge">{totalCount}</span>}
        </button>
        <button
          type="button"
          className={`emp-assignment-tab-btn ${history ? 'active' : ''}`}
          disabled={editing}
          onClick={() => {
            setHistory(true);
            setPage(1);
          }}
        >
          <History size={13} />
          <span>Assignment history</span>
          {history && query.data && <span className="emp-tab-badge">{totalCount}</span>}
        </button>
      </div>

      {saved && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            borderRadius: '6px',
            marginBottom: '12px',
            fontSize: '12px',
          }}
        >
          <CheckCircle2 size={14} />
          <span>Site assignment saved successfully.</span>
        </div>
      )}

      <QueryState query={query}>
        {query.data && (
          <>
            {items.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '36px 16px',
                  background: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px dashed #cbd5e1',
                  margin: '12px 0',
                }}
              >
                <MapPin size={28} style={{ color: '#94a3b8', margin: '0 auto 8px auto' }} />
                <div style={{ fontWeight: 650, color: '#334155', fontSize: '13px' }}>
                  {history ? 'No Historical Site Assignments' : 'No Current Site Assignments'}
                </div>
                <div
                  style={{
                    color: '#64748b',
                    fontSize: '11.5px',
                    marginTop: '4px',
                    maxWidth: '400px',
                    margin: '4px auto 0 auto',
                  }}
                >
                  {history
                    ? 'There are no past site assignment records for this employee.'
                    : 'This employee does not have an active or scheduled site assignment. Use the Assign / reassign site button above to configure their project location.'}
                </div>
              </div>
            ) : (
              <div
                style={{
                  overflowX: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  marginTop: '6px',
                }}
              >
                <table className="emp-assignment-table">
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>SITE / LOCATION</th>
                      <th style={{ width: '25%' }}>ROLE &amp; DEPARTMENT</th>
                      <th style={{ width: '22%' }}>REPORTING MANAGER</th>
                      <th style={{ width: '16%' }}>EFFECTIVE DATES</th>
                      <th style={{ width: '12%', textAlign: 'right' }}>DETAILS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => {
                      const dept = deptsQuery.data?.items.find(
                        (d) => d.id.toLowerCase() === row.departmentId?.toLowerCase(),
                      );
                      const desig = desigsQuery.data?.items.find(
                        (d) => d.id.toLowerCase() === row.designationId?.toLowerCase(),
                      );
                      const branch = branchesQuery.data?.items.find(
                        (b) => b.id.toLowerCase() === row.branchId?.toLowerCase(),
                      );
                      const staffCat = staffCatsQuery.data?.items.find(
                        (c) => c.id.toLowerCase() === row.staffCategoryId?.toLowerCase(),
                      );
                      const empType = empTypesQuery.data?.items.find(
                        (t) => t.id.toLowerCase() === row.employmentTypeId?.toLowerCase(),
                      );

                      const deptName =
                        dept?.name ||
                        (row.departmentId
                          ? row.departmentId.length > 20
                            ? `Dept (${row.departmentId.slice(0, 8)})`
                            : row.departmentId
                          : 'Not assigned');

                      const desigName =
                        desig?.name ||
                        (row.designationId
                          ? row.designationId.length > 20
                            ? `Desig (${row.designationId.slice(0, 8)})`
                            : row.designationId
                          : 'Not assigned');

                      const branchName =
                        branch?.name ||
                        (row.branchId
                          ? row.branchId.length > 20
                            ? `Office (${row.branchId.slice(0, 8)})`
                            : row.branchId
                          : null);

                      const isExpanded = expandedRows.has(row.id);

                      return (
                        <tr key={row.id}>
                          {/* 1. Site Column */}
                          <td>
                            <AssignmentSite siteId={row.siteId} />
                            {branchName && (
                              <div
                                style={{
                                  fontSize: '11px',
                                  color: '#64748b',
                                  marginTop: '3px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Building2 size={11} style={{ flexShrink: 0 }} />
                                <span>Office: {branchName}</span>
                              </div>
                            )}
                          </td>

                          {/* 2. Role & Department Column */}
                          <td>
                            <div style={{ fontWeight: 650, color: '#0f172a' }}>{desigName}</div>
                            <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                              {deptName}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                gap: '4px',
                                marginTop: '4px',
                                flexWrap: 'wrap',
                              }}
                            >
                              {staffCat && (
                                <span className="emp-category-pill">{staffCat.name}</span>
                              )}
                              {empType && <span className="emp-type-pill">{empType.name}</span>}
                            </div>
                          </td>

                          {/* 3. Reporting Manager Column */}
                          <td>
                            {row.reportingManagerId ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                                <EmployeeReference employeeId={row.reportingManagerId} showName />
                              </div>
                            ) : (
                              <span
                                className="muted"
                                style={{
                                  fontStyle: 'italic',
                                  fontSize: '11.5px',
                                  color: '#94a3b8',
                                }}
                              >
                                Direct / Unassigned
                              </span>
                            )}
                          </td>

                          {/* 4. Effective Period Column */}
                          <td>
                            <div style={{ fontSize: '11.5px', color: '#0f172a', fontWeight: 550 }}>
                              {row.effectiveFrom}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              {row.effectiveTo ? (
                                `To: ${row.effectiveTo}`
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    background: '#ecfdf5',
                                    color: '#047857',
                                    border: '1px solid #a7f3d0',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10.5px',
                                    fontWeight: 650,
                                  }}
                                >
                                  <CheckCircle2 size={10} /> Active / Open
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 5. Details Toggle */}
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="emp-card-edit-btn"
                              onClick={() => toggleRow(row.id)}
                              aria-expanded={isExpanded}
                              title={
                                isExpanded ? 'Hide audit details' : 'View full assignment audit'
                              }
                              style={{ whiteSpace: 'nowrap' }}
                            >
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              <span>{isExpanded ? 'Hide audit' : 'Audit facts'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Expandable Audit Details Row */}
                    {items.map((row) => {
                      if (!expandedRows.has(row.id)) return null;

                      const dept = deptsQuery.data?.items.find(
                        (d) => d.id.toLowerCase() === row.departmentId?.toLowerCase(),
                      );
                      const desig = desigsQuery.data?.items.find(
                        (d) => d.id.toLowerCase() === row.designationId?.toLowerCase(),
                      );
                      const branch = branchesQuery.data?.items.find(
                        (b) => b.id.toLowerCase() === row.branchId?.toLowerCase(),
                      );
                      const staffCat = staffCatsQuery.data?.items.find(
                        (c) => c.id.toLowerCase() === row.staffCategoryId?.toLowerCase(),
                      );
                      const empType = empTypesQuery.data?.items.find(
                        (t) => t.id.toLowerCase() === row.employmentTypeId?.toLowerCase(),
                      );

                      return (
                        <tr key={`audit-${row.id}`}>
                          <td
                            colSpan={5}
                            style={{
                              background: '#f8fafc',
                              padding: '12px 16px',
                              borderBottom: '1px solid #e2e8f0',
                            }}
                          >
                            <div className="emp-assignment-details-box">
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom: '8px',
                                  flexWrap: 'wrap',
                                  gap: '6px',
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#334155',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  Assignment Audit &amp; Reference Snapshots
                                </span>
                                <span
                                  className="emp-short-id-chip"
                                  title={`Assignment Record ID: ${row.id}`}
                                >
                                  ID: {row.id.slice(0, 8)}…{row.id.slice(-4)}
                                </span>
                              </div>

                              <div className="emp-kv-grid">
                                <div className="emp-kv-item">
                                  <span className="emp-kv-label">Department</span>
                                  <span
                                    className="emp-kv-value"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      flexWrap: 'wrap',
                                    }}
                                  >
                                    <span>{dept?.name || row.departmentId}</span>
                                    {dept?.code && (
                                      <span
                                        className="emp-short-id-chip"
                                        title={`Code: ${dept.code}`}
                                      >
                                        {dept.code}
                                      </span>
                                    )}
                                    {row.departmentId && (
                                      <span
                                        className="emp-short-id-chip"
                                        title={`UUID: ${row.departmentId}`}
                                      >
                                        {row.departmentId.slice(0, 8)}
                                      </span>
                                    )}
                                  </span>
                                </div>

                                <div className="emp-kv-item">
                                  <span className="emp-kv-label">Designation</span>
                                  <span
                                    className="emp-kv-value"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      flexWrap: 'wrap',
                                    }}
                                  >
                                    <span>{desig?.name || row.designationId}</span>
                                    {desig?.code && (
                                      <span
                                        className="emp-short-id-chip"
                                        title={`Code: ${desig.code}`}
                                      >
                                        {desig.code}
                                      </span>
                                    )}
                                    {row.designationId && (
                                      <span
                                        className="emp-short-id-chip"
                                        title={`UUID: ${row.designationId}`}
                                      >
                                        {row.designationId.slice(0, 8)}
                                      </span>
                                    )}
                                  </span>
                                </div>

                                <div className="emp-kv-item">
                                  <span className="emp-kv-label">Staff Category</span>
                                  <span
                                    className="emp-kv-value"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      flexWrap: 'wrap',
                                    }}
                                  >
                                    <span className="emp-category-pill">
                                      {staffCat?.name || 'Staff'}
                                    </span>
                                    {row.staffCategoryId && (
                                      <span
                                        className="emp-short-id-chip"
                                        title={`UUID: ${row.staffCategoryId}`}
                                      >
                                        {row.staffCategoryId.slice(0, 8)}
                                      </span>
                                    )}
                                  </span>
                                </div>

                                <div className="emp-kv-item">
                                  <span className="emp-kv-label">Employment Type</span>
                                  <span
                                    className="emp-kv-value"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      flexWrap: 'wrap',
                                    }}
                                  >
                                    <span className="emp-type-pill">
                                      {empType?.name || 'Regular'}
                                    </span>
                                    {row.employmentTypeId && (
                                      <span
                                        className="emp-short-id-chip"
                                        title={`UUID: ${row.employmentTypeId}`}
                                      >
                                        {row.employmentTypeId.slice(0, 8)}
                                      </span>
                                    )}
                                  </span>
                                </div>

                                <div className="emp-kv-item">
                                  <span className="emp-kv-label">Assigned Site</span>
                                  <span className="emp-kv-value">
                                    <AssignmentSite siteId={row.siteId} />
                                  </span>
                                </div>

                                <div className="emp-kv-item">
                                  <span className="emp-kv-label">Branch Office</span>
                                  <span className="emp-kv-value">
                                    <span>
                                      {branch?.name ||
                                        (row.branchId
                                          ? `Office (${row.branchId.slice(0, 8)})`
                                          : 'Not assigned')}
                                    </span>
                                  </span>
                                </div>

                                <div className="emp-kv-item">
                                  <span className="emp-kv-label">Reporting Manager</span>
                                  <span className="emp-kv-value">
                                    {row.reportingManagerId ? (
                                      <EmployeeReference
                                        employeeId={row.reportingManagerId}
                                        showName
                                      />
                                    ) : (
                                      <span className="muted">Not assigned</span>
                                    )}
                                  </span>
                                </div>

                                <div className="emp-kv-item">
                                  <span className="emp-kv-label">Employee Subject</span>
                                  <span className="emp-kv-value">
                                    <EmployeeReference employeeId={row.employeeId} showName />
                                  </span>
                                </div>

                                <div className="emp-kv-item">
                                  <span className="emp-kv-label">Effective Duration</span>
                                  <span className="emp-kv-value">
                                    {row.effectiveFrom} &rarr; {row.effectiveTo ?? 'Open'}
                                  </span>
                                </div>

                                <div className="emp-kv-item">
                                  <span className="emp-kv-label">Record Version</span>
                                  <span className="emp-kv-value">
                                    <span className="emp-short-id-chip">v{row.version}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: '10px' }}>
              <Pagination page={page} pageSize={20} total={totalCount} onChange={setPage} />
            </div>
          </>
        )}
      </QueryState>

      {editing && access.can(...read, ...write, 'hr.sites.read') && (
        <AssignmentEditor
          employeeId={employeeId}
          onClose={() => setEditing(false)}
          onSaved={(result) => {
            setEditing(false);
            setSaved(true);
            void query.refetch();
            onSaved?.(result);
          }}
        />
      )}
    </div>
  );
}

function AssignmentSite({ siteId }: { siteId: string | null }) {
  const access = useHrAccess();
  const query = useHrQuery(`sites/${siteId}`, siteSchema, ['hr.sites.read']);
  if (!siteId)
    return (
      <span className="muted" style={{ fontStyle: 'italic', fontSize: '11.5px', color: '#94a3b8' }}>
        Unassigned site
      </span>
    );
  if (!access.can('hr.sites.read') || !query.data) {
    return (
      <span className="emp-short-id-chip" title={`Site ID: ${siteId}`}>
        {siteId.length > 12 ? `${siteId.slice(0, 8)}…${siteId.slice(-4)}` : siteId}
      </span>
    );
  }
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontWeight: 650, color: '#0f172a' }}>{query.data.name}</span>
      {query.data.code && (
        <span className="emp-short-id-chip" title={`Site Code: ${query.data.code}`}>
          {query.data.code}
        </span>
      )}
    </div>
  );
}

function AssignmentEditor({
  employeeId,
  onClose,
  onSaved,
}: EmployeeSiteAssignmentsProps & { onClose: () => void }) {
  const [revision, setRevision] = useState(0);
  const query = useHrQuery(
    `employees/${employeeId}/assignments?page=1&pageSize=100`,
    employeeAssignmentPageSchema,
    read,
  );
  if (query.isSuccess)
    return (
      <AssignmentForm
        key={revision}
        employeeId={employeeId}
        initial={query.data}
        onClose={onClose}
        onSaved={onSaved}
        onReload={async () => {
          const result = await query.refetch();
          if (result.isSuccess) setRevision((value) => value + 1);
        }}
      />
    );
  return (
    <Dialog
      open
      title="Load assignments"
      description="Employee site assignment"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <QueryState query={query}>{null}</QueryState>
      <div style={{ marginTop: '12px' }}>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}

function AssignmentForm({
  employeeId,
  initial,
  onClose,
  onSaved,
  onReload,
}: EmployeeSiteAssignmentsProps & {
  initial: EmployeeAssignmentPage;
  onClose: () => void;
  onReload: () => Promise<void>;
}) {
  const [baseline] = useState(initial);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [reason, setReason] = useState('');
  const [dirty, setDirty] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);
  const action = useSiteAction();
  useDirtyForm(dirty || action.pending || action.locked);

  const close = () => {
    if (
      !action.pending &&
      (!(dirty || action.locked) ||
        window.confirm(
          'Discard this form? Check the record before starting another action if the result was uncertain.',
        ))
    )
      onClose();
  };

  return (
    <Dialog
      open
      title="Assign / Reassign Site"
      description="Select the working site and effective assignment date for this employee."
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '10px 12px',
          marginBottom: '14px',
        }}
      >
        <span
          style={{
            fontSize: '10.5px',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            display: 'block',
            marginBottom: '6px',
          }}
        >
          Current Assignment Status
        </span>
        {baseline.assignments.items.length === 0 ? (
          <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
            No active assignment recorded
          </span>
        ) : (
          baseline.assignments.items.map((row) => (
            <div
              key={row.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                flexWrap: 'wrap',
              }}
            >
              <AssignmentSite siteId={row.siteId} />
              <span className="emp-short-id-chip">
                {row.effectiveFrom} &rarr; {row.effectiveTo ?? 'Open'}
              </span>
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const parsed = assignEmployeeSiteSchema.safeParse({
            expectedVersion: baseline.version,
            siteId,
            effectiveFrom,
            reason,
          });
          if (!parsed.success) {
            setValidation(
              parsed.error.issues
                .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                .join(' '),
            );
            return;
          }
          setValidation(null);
          const result = await action.run(
            `employees/${employeeId}/assignments/site`,
            parsed.data,
            'POST',
            writeResult,
          );
          if (result) {
            setDirty(false);
            onSaved?.(result);
          }
        }}
      >
        <fieldset disabled={action.pending || action.locked || action.reloadRequired}>
          <ReferenceField
            label="Site"
            kind="sites"
            value={siteId}
            required
            onChange={(value) => {
              setSiteId(value);
              setDirty(true);
            }}
          />
          <TextInput
            label="Effective date"
            type="date"
            value={effectiveFrom}
            required
            onChange={(e) => {
              setEffectiveFrom(e.target.value);
              setDirty(true);
            }}
          />
          <TextInput
            label="Reason"
            value={reason}
            required
            maxLength={1000}
            onChange={(e) => {
              setReason(e.target.value);
              setDirty(true);
            }}
          />
        </fieldset>

        {validation && (
          <p className="hr-message hr-message--error" role="alert" style={{ marginTop: '10px' }}>
            {validation}
          </p>
        )}
        {action.error && (
          <p className="hr-message hr-message--error" role="alert" style={{ marginTop: '10px' }}>
            {action.error}
          </p>
        )}

        <div className="hr-actions" style={{ marginTop: '16px' }}>
          <Button type="submit" disabled={action.pending || action.reloadRequired}>
            <Save size={16} />
            {action.pending
              ? 'Saving...'
              : action.locked
                ? 'Retry unchanged action'
                : 'Save assignment'}
          </Button>
          <Button
            variant="secondary"
            disabled={action.pending}
            onClick={() => {
              if (
                !(dirty || action.locked) ||
                window.confirm('Discard the form and reload current assignments?')
              )
                void onReload();
            }}
          >
            <RefreshCw size={16} />
            Reload assignments
          </Button>
          <Button variant="secondary" disabled={action.pending} onClick={close}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
