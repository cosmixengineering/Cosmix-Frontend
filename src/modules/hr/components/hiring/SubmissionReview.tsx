import { Link } from 'react-router-dom';
import { Send, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useHrAction, useHrQuery } from '../../hooks/use-hr-queries';
import { useHrAccess } from '../../hooks/use-hr-access';
import { hiringDecisionsSchema, readinessSchema, documentsSchema } from '../../schemas/hiring';
import { writeResult } from '../../schemas/contracts';
import { ActionMessage, QueryState } from '../Feedback';
import { labelDate } from '../../utils/messages';

function fieldLink(field: string) {
  const base = field.split(/[.[]/)[0] ?? '';
  if (base === 'financial' || base === 'medical' || base === 'documents') return '?tab=' + base;
  const addressSection: Record<string, string> = {
    currentAddress: 'current-address',
    permanentAddress: 'permanent-address',
    emergencyContact: 'emergency-contact',
  };
  if (addressSection[base]) return '?tab=profile#' + addressSection[base];
  const section =
    base === 'previousEmployment'
      ? 'previous-employment'
      : base === 'assets' || base === 'certifications'
        ? base
        : /department|designation|staffCategory|employmentType|branch|reportingManager|joined|probation/.test(
              base,
            )
          ? 'employment'
          : /loginPhone|mobile/.test(base)
            ? 'mobile'
            : /Phone|Email/.test(base)
              ? 'contacts'
              : 'identity';
  return '?tab=profile#' + section;
}
export function SubmissionReview({
  employeeId,
  version,
  editable,
  selected,
  onSaved,
}: {
  employeeId: string;
  version: string;
  editable: boolean;
  selected: string[];
  onSaved: () => void;
}) {
  const access = useHrAccess();
  const action = useHrAction();
  const readiness = useHrQuery(
    `employees/${employeeId}/submission-validation`,
    readinessSchema,
    ['hr.employees.read', 'hr.employees.submit'],
    editable,
  );
  const decisions = useHrQuery(`employees/${employeeId}/decisions`, hiringDecisionsSchema, [
    'hr.employees.read',
  ]);
  const docs = useHrQuery(`employees/${employeeId}/documents`, documentsSchema, [
    'hr.employees.read',
    'hr.employees.documents.read',
  ]);
  return (
    <>
      {editable && access.can('hr.employees.submit') && (
        <section className="hr-form-section">
          <div className="hr-repeat-heading">
            <h2>Submission readiness</h2>
            <Button
              title="Refresh readiness"
              aria-label="Refresh readiness"
              variant="ghost"
              onClick={() => void readiness.refetch()}
            >
              <RefreshCw size={17} />
            </Button>
          </div>
          <QueryState query={readiness}>
            {readiness.data && (
              <>
                {readiness.data.canSubmit ? (
                  <p className="hr-message">Ready for submission.</p>
                ) : (
                  <p className="hr-message hr-message--error">
                    This draft is not ready for submission.
                  </p>
                )}
                <ul className="hr-validation-list">
                  {readiness.data.missingFields.map((f) => (
                    <li key={f}>
                      <Link to={fieldLink(f)}>
                        {f.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('.', ' / ')}
                      </Link>
                    </li>
                  ))}
                </ul>
                {readiness.data.unavailableDocumentIds.length > 0 && (
                  <p role="alert">
                    {readiness.data.unavailableDocumentIds.length} selected document(s) are
                    unavailable.
                  </p>
                )}
              </>
            )}
          </QueryState>
          <Button
            disabled={!readiness.data?.canSubmit || readiness.isFetching || action.pending}
            onClick={() => {
              if (window.confirm('Submit this saved employee draft to Admin for approval?'))
                void action
                  .run(
                    `employees/${employeeId}/submit`,
                    { expectedVersion: version },
                    'POST',
                    writeResult,
                  )
                  .then((r) => {
                    if (r) onSaved();
                  });
            }}
          >
            <Send size={16} />
            Submit for approval
          </Button>
          <ActionMessage action={{ error: action.error, success: null }} />
        </section>
      )}
      <section className="hr-form-section">
        <h2>Selected documents</h2>
        {selected.length ? (
          <ul>
            {selected.map((documentId) => (
              <li key={documentId}>
                {docs.data?.find((d) => d.id === documentId)?.fileName ??
                  'Protected document reference'}{' '}
                <span className="muted">
                  {docs.data?.find((d) => d.id === documentId)?.isAvailable
                    ? 'Available'
                    : 'Not confirmed available'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No documents selected.</p>
        )}
      </section>
      <section className="hr-form-section">
        <h2>Hiring decisions</h2>
        <QueryState query={decisions}>
          {!decisions.data?.length && <p className="muted">No decisions recorded.</p>}
          {decisions.data?.map((d) => (
            <article key={d.id} className="hr-repeat">
              <h3>
                {({ 1: 'Approved', 2: 'Returned', 3: 'Rejected' } as Record<number, string>)[
                  d.decision
                ] ?? 'Decision recorded'}
              </h3>
              <p>{d.reason ?? 'No reason recorded.'}</p>
              <p className="muted">
                {labelDate(d.decidedAt)} &middot; Actor {d.actorAccountId ?? 'Not recorded'}
              </p>
            </article>
          ))}
        </QueryState>
      </section>
    </>
  );
}
