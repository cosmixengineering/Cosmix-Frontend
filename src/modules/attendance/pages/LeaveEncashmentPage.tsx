import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { TextInput } from '@/components/forms/TextInput';
import { SelectInput } from '@/components/forms/SelectInput';
import { Button } from '@/components/ui/Button';
import { useAttendanceAccess } from '../hooks/use-attendance-access';
import { useAttendanceAction } from '../hooks/use-attendance-action';
import { useAttendanceQuery } from '../hooks/use-attendance-query';

const permissions = {
  submit: 'attendance.leave.encashment.submit',
  mine: 'attendance.leave.encashment.mine',
  queue: 'attendance.leave.encashment.queue',
  decide: 'attendance.leave.encashment.decide',
};

const decisionOptions = [
  { value: '1', label: 'Approve' },
  { value: '2', label: 'Return' },
  { value: '3', label: 'Reject' },
];

const stateLabels: Record<number, string> = {
  0: 'Pending',
  1: 'Approved',
  2: 'Returned',
  3: 'Rejected',
  4: 'Cancelled',
};

const leaveDecision = z.object({
  id: z.uuid(),
  approvalRequestId: z.uuid(),
  decision: z.number().int(),
  actorRole: z.string(),
  reason: z.string().nullable(),
  atUtc: z.string(),
});

const encashment = z.object({
  id: z.uuid(),
  employeeId: z.uuid(),
  leaveYearStart: z.iso.date(),
  leaveYearEnd: z.iso.date(),
  requestedMinutes: z.number().int(),
  assessedKpiPercent: z.number(),
  proposedAmount: z.number(),
  currency: z.string(),
  policyVersionId: z.uuid(),
  approvalRequestId: z.uuid(),
  state: z.number().int().min(0).max(4),
  approvalVersion: z.string(),
  createdAt: z.string(),
  decisions: z.array(leaveDecision),
});
const encashmentList = z.array(encashment);
type Encashment = z.infer<typeof encashment>;

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function LeaveEncashmentPage() {
  const access = useAttendanceAccess();
  const tabs = [
    ...(access.can(permissions.mine) ? [{ id: 'mine', label: 'My encashments' }] : []),
    ...(access.can(permissions.queue) ? [{ id: 'queue', label: 'Review queue' }] : []),
  ];
  const [tab, setTab] = useState(tabs[0]?.id ?? '');
  if (!tabs.length)
    return (
      <section aria-label="Leave encashment">
        <div className="hr-page-heading">
          <p className="hr-kicker">HUMAN RESOURCES &bull; Leave</p>
          <h1>Leave Encashment</h1>
        </div>
        <p className="hr-notice" role="alert">
          You do not hold a permission for leave encashment.
        </p>
      </section>
    );
  const active = tabs.some((item) => item.id === tab) ? tab : (tabs[0]?.id ?? '');
  return (
    <section aria-label="Leave encashment">
      <div className="hr-page-heading">
        <p className="hr-kicker">HUMAN RESOURCES &bull; Leave</p>
        <h1>Leave Encashment</h1>
      </div>
      <nav className="hr-tabs" aria-label="Leave encashment views">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === active ? 'active' : ''}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {active === 'mine' && <MyEncashments canSubmit={access.can(permissions.submit)} />}
      {active === 'queue' && <EncashmentQueue canDecide={access.can(permissions.decide)} />}
    </section>
  );
}

function MyEncashments({ canSubmit }: { canSubmit: boolean }) {
  const action = useAttendanceAction();
  const list = useAttendanceQuery('/leaves/mine/encashment', encashmentList, true);
  const [form, setForm] = useState({
    requestedMinutes: '480',
    leaveYearStart: '',
    leaveYearEnd: '',
    reason: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  async function submit(event: FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    const minutes = Number(form.requestedMinutes);
    if (!Number.isInteger(minutes) || minutes < 60 || minutes > 43200)
      errors.requestedMinutes = 'Enter a whole number of minutes between 60 and 43200 (8h = 480).';
    if (!form.leaveYearStart) errors.leaveYearStart = 'A leave year start is required.';
    if (!form.leaveYearEnd) errors.leaveYearEnd = 'A leave year end is required.';
    if (form.leaveYearStart && form.leaveYearEnd && form.leaveYearEnd < form.leaveYearStart)
      errors.leaveYearEnd = 'The leave year end cannot be before the start.';
    if (!form.reason.trim()) errors.reason = 'A reason is required.';
    else if (form.reason.length > 1000) errors.reason = 'The reason must be at most 1000 characters.';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    await action.run(
      '/leaves/mine/encashment',
      {
        requestedMinutes: minutes,
        leaveYearStart: form.leaveYearStart,
        leaveYearEnd: form.leaveYearEnd,
        reason: form.reason.trim(),
      },
      'POST',
      encashment,
    );
  }
  return (
    <>
      {canSubmit && (
        <div className="hr-form-section">
          <h2>Submit an encashment</h2>
          <p className="muted">
            The assessed KPI percent and proposed amount are calculated on the server from your
            latest KPI record and monthly base salary for the chosen leave year.
          </p>
          <form onSubmit={(event) => void submit(event)}>
            <div className="hr-form-grid">
              <TextInput
                label="Requested minutes"
                required
                type="number"
                min={60}
                max={43200}
                value={form.requestedMinutes}
                error={fieldErrors.requestedMinutes}
                onChange={(event) => setForm({ ...form, requestedMinutes: event.target.value })}
              />
              <TextInput
                label="Leave year start"
                required
                type="date"
                value={form.leaveYearStart}
                error={fieldErrors.leaveYearStart}
                onChange={(event) => setForm({ ...form, leaveYearStart: event.target.value })}
              />
              <TextInput
                label="Leave year end"
                required
                type="date"
                value={form.leaveYearEnd}
                error={fieldErrors.leaveYearEnd}
                onChange={(event) => setForm({ ...form, leaveYearEnd: event.target.value })}
              />
            </div>
            <label className="hr-field">
              <span>Reason</span>
              <textarea
                rows={3}
                required
                maxLength={1000}
                value={form.reason}
                aria-invalid={Boolean(fieldErrors.reason)}
                onChange={(event) => setForm({ ...form, reason: event.target.value })}
              />
              {fieldErrors.reason && <p className="field-error">{fieldErrors.reason}</p>}
            </label>
            {action.error && (
              <p className="hr-message hr-message--error" role="alert">
                {action.error}
              </p>
            )}
            {action.success && (
              <p className="hr-message" role="status">
                {action.success}
              </p>
            )}
            {action.uncertain && (
              <p className="hr-notice" role="alert">
                The last result is unconfirmed. Reload to check before retrying.
              </p>
            )}
            <div className="hr-actions">
              <Button type="submit" disabled={action.pending}>
                {action.pending ? 'Submitting...' : 'Submit encashment'}
              </Button>
            </div>
          </form>
        </div>
      )}
      <div className="hr-form-section">
        <h2>My applications</h2>
        {list.isPending && (
          <p className="hr-notice" role="status">
            Loading encashments...
          </p>
        )}
        {list.isError && (
          <div className="hr-notice" role="alert">
            <p>Could not load your encashment applications.</p>
            <Button variant="secondary" onClick={() => void list.refetch()}>
              Retry
            </Button>
          </div>
        )}
        {list.data?.length === 0 && (
          <p className="hr-notice" role="status">
            You have not submitted any encashment applications.
          </p>
        )}
        {list.data?.map((item) => (
          <EncashmentCard key={item.id} item={item} />
        ))}
      </div>
    </>
  );
}

function EncashmentQueue({ canDecide }: { canDecide: boolean }) {
  const action = useAttendanceAction();
  const list = useAttendanceQuery('/leaves/admin/encashment/queue', encashmentList, true);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [decision, setDecision] = useState('1');
  const [reason, setReason] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  async function decide(item: Encashment) {
    const errors: Record<string, string> = {};
    if (!reason.trim()) errors.reason = 'A reason is required.';
    else if (reason.length > 1000) errors.reason = 'The reason must be at most 1000 characters.';
    const amount = approvedAmount ? Number(approvedAmount) : null;
    if (amount !== null && (!Number.isFinite(amount) || amount < 0))
      errors.approvedAmount = 'Enter a non-negative amount or leave the field empty.';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    const result = await action.run(
      `/leaves/admin/encashment/${item.id}/decisions`,
      {
        decision: Number(decision),
        expectedApprovalVersion: item.approvalVersion,
        reason: reason.trim(),
        approvedAmount: amount,
      },
      'POST',
      encashment,
    );
    if (result) {
      setDeciding(null);
      setReason('');
      setApprovedAmount('');
    }
  }
  return (
    <div className="hr-form-section">
      <h2>Pending encashments</h2>
      {list.isPending && (
        <p className="hr-notice" role="status">
          Loading queue...
        </p>
      )}
      {list.isError && (
        <div className="hr-notice" role="alert">
          <p>Could not load the encashment queue.</p>
          <Button variant="secondary" onClick={() => void list.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {list.data?.length === 0 && (
        <p className="hr-notice" role="status">
          No pending encashment applications.
        </p>
      )}
      {list.data?.map((item) => (
        <article className="hr-repeat" key={item.id}>
          <EncashmentCard item={item} />
          {canDecide && (
            <div className="hr-actions">
              {deciding === item.id ? (
                <>
                  <SelectInput
                    label="Decision"
                    value={decision}
                    onChange={(event) => setDecision(event.target.value)}
                    options={decisionOptions}
                  />
                  <TextInput
                    label="Approved amount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={approvedAmount}
                    error={fieldErrors.approvedAmount}
                    onChange={(event) => setApprovedAmount(event.target.value)}
                  />
                  <label className="hr-field">
                    <span>Reason</span>
                    <textarea
                      rows={2}
                      required
                      maxLength={1000}
                      value={reason}
                      aria-invalid={Boolean(fieldErrors.reason)}
                      onChange={(event) => setReason(event.target.value)}
                    />
                    {fieldErrors.reason && <p className="field-error">{fieldErrors.reason}</p>}
                  </label>
                  <Button variant="secondary" onClick={() => void decide(item)} disabled={action.pending}>
                    {action.pending ? 'Recording...' : 'Record decision'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setDeciding(null);
                      setReason('');
                      setFieldErrors({});
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button variant="secondary" onClick={() => setDeciding(item.id)}>
                  Decide
                </Button>
              )}
            </div>
          )}
        </article>
      ))}
      {action.error && (
        <p className="hr-message hr-message--error" role="alert">
          {action.error}
        </p>
      )}
      {action.success && (
        <p className="hr-message" role="status">
          {action.success}
        </p>
      )}
    </div>
  );
}

function EncashmentCard({ item }: { item: Encashment }) {
  const latest = item.decisions.length ? item.decisions[item.decisions.length - 1] : undefined;
  return (
    <article className="hr-repeat">
      <div className="hr-repeat-heading">
        <h3>
          {formatMinutes(item.requestedMinutes)} &middot; {item.currency}{' '}
          {item.proposedAmount.toFixed(2)}
        </h3>
        <span
          className={`hr-status ${
            item.state === 1
              ? 'hr-status--ok'
              : item.state === 0
                ? 'hr-status--neutral'
                : 'hr-status--error'
          }`}
        >
          {stateLabels[item.state] ?? String(item.state)}
        </span>
      </div>
      <dl className="hr-detail-grid">
        <div>
          <dt>Leave year</dt>
          <dd>
            {item.leaveYearStart} to {item.leaveYearEnd}
          </dd>
        </div>
        <div>
          <dt>Assessed KPI</dt>
          <dd>{item.assessedKpiPercent.toFixed(1)}%</dd>
        </div>
        <div>
          <dt>Submitted</dt>
          <dd>{new Date(item.createdAt).toLocaleString()}</dd>
        </div>
        {latest && (
          <div>
            <dt>Latest decision</dt>
            <dd>
              {stateLabels[latest.decision] ?? ''} by {latest.actorRole}
              {latest.reason ? ` — ${latest.reason}` : ''}
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}
