import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ClipboardCheck, ClipboardList, Gift, Receipt, Settings } from 'lucide-react';
import { z } from 'zod';
import { Pagination } from '@/components/data-display/Pagination';
import { TextInput } from '@/components/forms/TextInput';
import { Denied, PrivateWorkspace, QueryState } from '../components/SchedulingUi';
import { queryString } from '../api/attendance-api';
import { useAttendanceAccess } from '../hooks/use-attendance-access';
import { useAttendanceQuery } from '../hooks/use-attendance-query';
import { Reload } from '../operations/leave-policy/Ui';
import { canEmployee, supportedScopes, type Scope } from '../operations/review/access';
import { EmployeeWorkspace } from '../operations/review/ReviewUi';
import { date, id, pageOf } from '../schemas/common';
import { businessToday } from '../utils/messages';
import '@/styles/leave-management.css';

const LeaveAdminPage = lazy(() =>
  import('../operations/leave-policy').then((module) => ({ default: module.LeaveAdminPage })),
);

const calendarPermission = 'attendance.leaves.team-calendar.read';
const calendarStatus = z.enum([
  'pending',
  'approved',
  'returned',
  'rejected',
  'cancelled',
  'cancellation_pending',
  'superseded',
]);
const calendarPage = pageOf(z.object({ employeeId: id, date, status: calendarStatus }));
const statusLabels: Record<z.infer<typeof calendarStatus>, string> = {
  pending: 'Pending',
  approved: 'Approved',
  returned: 'Returned',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  cancellation_pending: 'Approved - cancellation pending',
  superseded: 'Superseded',
};

export function LeaveManagementPage() {
  return (
    <PrivateWorkspace resource="leave-management">
      <ManagementWorkspace />
    </PrivateWorkspace>
  );
}

function ManagementWorkspace() {
  const access = useAttendanceAccess();
  const canReadCalendar =
    access.ready && supportedScopes(access.user, calendarPermission).length > 0;
  const canReview = access.can('attendance.leaves.review');
  const canConfigure = access.can('attendance.leaves.configure');
  const canReviewBenefits = access.can('attendance.leaves.benefits.review');
  return (
    <div className="leave-v4-shell">
      <div className="leave-v4-header">
        <div>
          <div className="leave-v4-title-row">
            <h1 className="leave-v4-title">Leave Management &amp; Approvals</h1>
            <span className="leave-v4-breadcrumb">
              <Building2 size={12} /> Human Resources
            </span>
          </div>
          <p className="leave-v4-sub">
            View recorded employee leave dates and review permitted requests using current server
            records and approval evidence.
          </p>
        </div>
        <div className="leave-v4-nav-links">
          {canReadCalendar && canReview && (
            <Link to="/hr/attendance/leaves" className="leave-v4-btn-nav">
              <ClipboardList size={12} /> Review employee requests
            </Link>
          )}
          {canConfigure && (
            <Link to="/hr/attendance/leave-settings" className="leave-v4-btn-nav">
              <Settings size={12} /> Leave Settings
            </Link>
          )}
          {canReview && (
            <Link to="/hr/leave-encashment" className="leave-v4-btn-nav">
              <Receipt size={12} /> Encashment Review
            </Link>
          )}
          {canReviewBenefits && (
            <Link to="/hr/attendance/leave-benefits" className="leave-v4-btn-nav">
              <Gift size={12} /> Leave benefits
            </Link>
          )}
          {canReview && (
            <Link to="/hr/attendance/recovery-work" className="leave-v4-btn-nav">
              <ClipboardCheck size={12} /> Recovery work review
            </Link>
          )}
        </div>
      </div>
      {canReadCalendar ? (
        <EmployeeWorkspace permission={calendarPermission} title="Employee leave calendar">
          {(employeeId, scope) => (
            <EmployeeCalendar key={employeeId} employeeId={employeeId} scope={scope} />
          )}
        </EmployeeWorkspace>
      ) : canReview ? (
        <Suspense fallback={<p role="status">Loading leave review...</p>}>
          <LeaveAdminPage />
        </Suspense>
      ) : (
        <Denied>Employee leave access has not been assigned to this account.</Denied>
      )}
    </div>
  );
}

function EmployeeCalendar({ employeeId, scope }: { employeeId: string; scope?: Scope }) {
  const access = useAttendanceAccess();
  const [from, setFrom] = useState(() => businessToday().slice(0, 8) + '01');
  const [to, setTo] = useState(businessToday);
  const [page, setPage] = useState(1);
  const allowed = access.ready && canEmployee(access.user, calendarPermission, employeeId, scope);
  const rangeValid =
    date.safeParse(from).success &&
    date.safeParse(to).success &&
    from >= '1901-01-01' &&
    to <= '9997-12-31' &&
    to >= from &&
    Date.parse(to) - Date.parse(from) <= 30 * 86400000;
  const query = useAttendanceQuery(
    '/leaves/team-calendar' +
      queryString({ employeeIds: employeeId, from, to, page, pageSize: 25 }),
    calendarPage.refine(
      (value) =>
        value.items.every(
          (entry) =>
            entry.employeeId.toLowerCase() === employeeId.toLowerCase() &&
            entry.date >= from &&
            entry.date <= to,
        ),
      'Calendar records do not match the selected employee and dates.',
    ),
    allowed && rangeValid,
  );
  if (!allowed) return <Denied>Matching employee leave calendar access is required.</Denied>;
  return (
    <section className="attendance-section" aria-label="Employee leave dates">
      <div className="attendance-grid">
        <TextInput
          label="From"
          type="date"
          value={from}
          onChange={(event) => {
            setFrom(event.target.value);
            setPage(1);
          }}
        />
        <TextInput
          label="To"
          type="date"
          value={to}
          onChange={(event) => {
            setTo(event.target.value);
            setPage(1);
          }}
        />
        <Reload onClick={() => void query.refetch()} disabled={!rangeValid || query.isFetching} />
      </div>
      {!rangeValid ? (
        <p role="alert">Select a date range of up to 31 days.</p>
      ) : (
        <>
          <QueryState
            query={query}
            empty={query.data?.items.length === 0}
            emptyText="No leave records for this employee in the selected dates."
          />
          {!query.isError && query.data && query.data.items.length > 0 && (
            <>
              <div className="table-scroll">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.items.map((entry) => (
                      <tr key={`${entry.employeeId}:${entry.date}:${entry.status}`}>
                        <td>{entry.date}</td>
                        <td>{statusLabels[entry.status]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={page}
                pageSize={25}
                total={query.data.totalCount}
                onChange={setPage}
                disabled={query.isFetching}
              />
            </>
          )}
        </>
      )}
    </section>
  );
}
