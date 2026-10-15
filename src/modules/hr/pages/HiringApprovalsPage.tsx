import { useState } from 'react';
import { Search } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { SelectInput } from '@/components/forms/SelectInput';
import { Pagination } from '@/components/data-display/Pagination';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useHrAccess } from '../hooks/use-hr-access';
import { useHrQuery } from '../hooks/use-hr-queries';
import { pageOf } from '../schemas/contracts';
import { submissionSummarySchema, type SubmissionSummary } from '../schemas/approvals';
import { onboardingLabels } from '../types/contracts';
import { queryString } from '../api/hr-api';
import { labelDate } from '../utils/messages';
import { Denied, QueryState } from '../components/Feedback';
import { HiringSubmissionReview } from '../components/approvals/HiringSubmissionReview';

export function HiringApprovalsPage() {
  const access = useHrAccess();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('1');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<SubmissionSummary | null>(null);
  const [message, setMessage] = useState('');
  const [reviewDirty, setReviewDirty] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const term = useDebouncedValue(search);
  const query = useHrQuery(
    'employees/submissions' + queryString({ page, pageSize: 15, search: term, status }),
    pageOf(submissionSummarySchema),
    ['hr.employees.read', 'hr.employees.submissions.review'],
  );
  if (!access.can('hr.employees.read', 'hr.employees.submissions.review')) return <Denied />;
  return (
    <>
      <div className="hr-page-heading">
        <div>
          <p className="hr-kicker">HUMAN RESOURCES</p>
          <h1>Hiring approvals</h1>
        </div>
      </div>
      {message && (
        <p role="status" className="hr-message">
          {message}
        </p>
      )}
      <div className="hr-toolbar">
        <label className="hr-search">
          <Search size={17} />
          <input
            aria-label="Search hiring submissions"
            placeholder="Search employee name"
            maxLength={100}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <SelectInput
          label="Hiring review status"
          value={status}
          options={[1, 2, 3, 4].map((i) => ({
            value: String(i),
            label: onboardingLabels[i] ?? 'Unknown',
          }))}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <QueryState query={query}>
        {!query.data?.items.length && <p className="hr-notice">No submissions match this view.</p>}
        {query.data?.items.map((s) => (
          <article key={s.id} className="hr-request-row">
            <div>
              <button
                className="hr-text-button"
                disabled={!access.can('hr.employees.documents.read')}
                onClick={() => {
                  setMessage('');
                  setSelected(s);
                }}
              >
                {s.name ?? 'Employee'} &middot; #{s.employeeNumber}
              </button>
              <p className="muted">
                Revision {s.version} &middot; {labelDate(s.submittedAt)}
              </p>
            </div>
            <span className="hr-status hr-status--neutral">{onboardingLabels[s.status]}</span>
          </article>
        ))}
        {query.data && (
          <Pagination page={page} pageSize={15} total={query.data.totalCount} onChange={setPage} />
        )}
      </QueryState>
      {!access.can('hr.employees.documents.read') && (
        <p className="hr-notice">Document access is required to review a submission.</p>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (
            !open &&
            !reviewBusy &&
            (!reviewDirty || window.confirm('Discard the unsaved hiring decision?'))
          ) {
            setSelected(null);
            setReviewDirty(false);
          }
        }}
        title="Hiring submission"
        description={selected ? `${selected.name ?? 'Employee'} · #${selected.employeeNumber}` : ''}
      >
        {selected && (
          <HiringSubmissionReview
            key={selected.id}
            submission={selected}
            onDirty={setReviewDirty}
            onBusy={setReviewBusy}
            onSaved={(decision) => {
              setSelected(null);
              setMessage(`Hiring decision recorded: ${decision}.`);
              void query.refetch();
            }}
          />
        )}
      </Dialog>
    </>
  );
}
