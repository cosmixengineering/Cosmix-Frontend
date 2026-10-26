import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Clock, Eye, LayoutGrid, Plus, RefreshCw, Table } from 'lucide-react';
import { useAttendanceAccess } from '../../hooks/use-attendance-access';
import { useAttendanceQuery } from '../../hooks/use-attendance-query';
import { queryString } from '../../api/attendance-api';
import { shiftPage } from '../../schemas/shifts';
import { Command, Denied, QueryState } from '../SchedulingUi';
import { ShiftMetadataForm } from './ShiftMetadataForm';
import '@/styles/shift-management.css';

export function ShiftList({ onOpen }: { onOpen: (id: string) => void }) {
  const access = useAttendanceAccess();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [creating, setCreating] = useState(false);
  const allowed = access.can('attendance.shifts.read');
  const query = useAttendanceQuery(
    '/hr/shifts' +
      queryString({
        page,
        pageSize: 25,
        sortBy: 'code',
        search,
        isActive: status === 'all' ? undefined : status === 'active',
      }),
    shiftPage,
    allowed,
  );
  const data = query.isError ? undefined : query.data;
  const rows = data?.items ?? [];
  function close() {
    setCreating(false);
    void query.refetch();
  }
  if (!allowed) return <Denied>Shift management requires All-scoped shift read access.</Denied>;
  return (
    <div className="shifts-page-shell">
      <div className="shifts-top-header">
        <div className="shifts-title-group">
          <h1 className="shifts-main-title">Work Shifts &amp; Master Timings</h1>
          <span className="shifts-breadcrumb-pill">
            <Building2 size={13} /> Human Resources
          </span>
        </div>
        <Command
          icon={RefreshCw}
          variant="secondary"
          disabled={creating || query.isFetching}
          onClick={() => void query.refetch()}
        >
          Refresh
        </Command>
      </div>
      <p>
        Review saved shifts and their dated schedule versions. Site and office assignments are
        managed in their roster workspaces.
      </p>
      {access.can('attendance.policies.configure') && (
        <p>
          <Link to="/hr/attendance/policies">
            Configure grace periods, half-day rules and attendance deductions
          </Link>
        </p>
      )}
      <div className="shifts-kpi-grid">
        <div className="shifts-kpi-card">
          <div className="shifts-kpi-left">
            <span className="shifts-kpi-label purple">Matching shifts</span>
            <div className="shifts-kpi-value">{data?.totalCount ?? '—'}</div>
            <span className="shifts-kpi-subtext">Current search and status filters</span>
          </div>
          <div className="shifts-kpi-icon-box blue">
            <Clock size={18} />
          </div>
        </div>
        <div className="shifts-kpi-card">
          <div className="shifts-kpi-left">
            <span className="shifts-kpi-label green">Active on this page</span>
            <div className="shifts-kpi-value">
              {data ? rows.filter((row) => row.isActive).length : '—'}
            </div>
            <span className="shifts-kpi-subtext">Up to 25 saved records per page</span>
          </div>
        </div>
      </div>
      {creating ? (
        <ShiftMetadataForm
          mode="create"
          onCancel={close}
          onSaved={(shift) => {
            setCreating(false);
            onOpen(shift.id);
          }}
        />
      ) : (
        <>
          <div className="shifts-toolbar">
            <div className="shifts-toolbar-left">
              <input
                aria-label="Search shifts"
                className="shifts-search-input"
                placeholder="Search by name or code"
                maxLength={100}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
              <select
                aria-label="Shift status"
                className="shifts-select-pill"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="shifts-toolbar-right">
              <Command
                icon={LayoutGrid}
                variant="secondary"
                onClick={() => setView('cards')}
                aria-pressed={view === 'cards'}
              >
                Cards
              </Command>
              <Command
                icon={Table}
                variant="secondary"
                onClick={() => setView('table')}
                aria-pressed={view === 'table'}
              >
                Table
              </Command>
              {access.can('attendance.shifts.manage') && (
                <Command icon={Plus} onClick={() => setCreating(true)}>
                  Create shift
                </Command>
              )}
            </div>
          </div>
          <QueryState
            query={query}
            empty={rows.length === 0}
            emptyText="No saved shifts match these filters."
          />
          {data &&
            (view === 'cards' ? (
              <div className="shifts-cards-container">
                {rows.map((shift) => (
                  <article
                    key={shift.id}
                    className={`shift-card-v2${shift.isActive ? '' : ' inactive'}`}
                  >
                    <div className="shift-card-v2-header">
                      <div className="shift-card-head-details">
                        <span>
                          {shift.code} · {shift.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <h2 className="shift-card-title">{shift.name}</h2>
                      </div>
                    </div>
                    <div className="shift-card-v2-body">
                      <p>
                        Open the saved schedule to review effective dates, start/end times, breaks,
                        weekdays and checkout reminder settings.
                      </p>
                    </div>
                    <div className="shift-card-v2-footer">
                      <Command
                        icon={Eye}
                        disabled={query.isFetching}
                        onClick={() => onOpen(shift.id)}
                      >
                        Review schedule
                      </Command>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="shifts-table-container">
                <table className="shifts-table-element">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Schedule</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((shift) => (
                      <tr key={shift.id}>
                        <td>{shift.code}</td>
                        <td>{shift.name}</td>
                        <td>{shift.isActive ? 'Active' : 'Inactive'}</td>
                        <td>
                          <Command
                            icon={Eye}
                            disabled={query.isFetching}
                            onClick={() => onOpen(shift.id)}
                          >
                            Review schedule
                          </Command>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          <div className="attendance-commands">
            <button
              type="button"
              disabled={page === 1 || query.isFetching}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              type="button"
              disabled={!data || page * data.pageSize >= data.totalCount || query.isFetching}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
