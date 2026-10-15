import { useState } from 'react';
import { Plus } from 'lucide-react';
import { TextInput } from '@/components/forms/TextInput';
import {
  Command,
  Denied,
  MutationForm,
  PrivateWorkspace,
  QueryState,
} from '../../components/SchedulingUi';
import { useAttendanceAccess } from '../../hooks/use-attendance-access';
import { useAttendanceQuery } from '../../hooks/use-attendance-query';
import {
  leavePolicies,
  leavePolicy,
  leavePolicyInput,
  leaveType,
  leaveTypeInput,
  leaveTypes,
} from './contracts';
import { canAll, kindNames } from './inputs';
import { Choice, EvidenceRecord, Reload } from './Ui';

export function LeaveSettingsPage() {
  return (
    <PrivateWorkspace resource="leave-settings">
      <LeaveSettings />
    </PrivateWorkspace>
  );
}
function LeaveSettings() {
  const access = useAttendanceAccess();
  const allowed = access.ready && canAll(access.user, 'attendance.leaves.configure');
  const types = useAttendanceQuery('/hr/leave-settings/types', leaveTypes, allowed);
  const policies = useAttendanceQuery('/hr/leave-settings/policies', leavePolicies, allowed);
  const [form, setForm] = useState('');
  const [epoch, setEpoch] = useState(0);
  function reload() {
    setForm('');
    setEpoch((e) => e + 1);
    void types.refetch();
    void policies.refetch();
  }
  if (!allowed)
    return <Denied>Leave settings require the explicit All-scoped configure permission.</Denied>;
  return (
    <>
      <div className="attendance-heading">
        <h1>Leave settings</h1>
        <Reload
          onClick={reload}
          disabled={Boolean(form) || types.isFetching || policies.isFetching}
        />
      </div>
      {form === 'type' ? (
        <LeaveTypeForm key={epoch} onSaved={reload} onCancel={reload} />
      ) : form === 'policy' ? (
        <LeavePolicyForm key={epoch} onSaved={reload} onCancel={reload} />
      ) : (
        <div className="attendance-commands">
          <Command icon={Plus} onClick={() => setForm('type')}>
            Create leave type
          </Command>
          <Command icon={Plus} onClick={() => setForm('policy')}>
            Publish leave settings
          </Command>
        </div>
      )}
      <section className="attendance-section">
        <h2>Current types</h2>
        <QueryState query={types} empty={types.data?.length === 0} />
        {!types.isError &&
          types.data?.map((row) => (
            <details key={row.id}>
              <summary>
                {row.code}: {row.name}
                {row.isActive ? '' : ' (inactive)'}
              </summary>
              <EvidenceRecord value={{ ...row, kind: kindNames[row.kind] }} />
            </details>
          ))}
      </section>
      <section className="attendance-section">
        <h2>Immutable published settings</h2>
        <QueryState query={policies} empty={policies.data?.length === 0} />
        {!policies.isError &&
          policies.data?.map((row) => (
            <details key={row.versionId}>
              <summary>
                {row.code}: {row.effectiveFrom} to {row.effectiveTo ?? 'open'}
              </summary>
              <EvidenceRecord value={row} />
            </details>
          ))}
      </section>
    </>
  );
}
function LeaveTypeForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState('');
  const [evidence, setEvidence] = useState('');
  const [advance, setAdvance] = useState('');
  const [regular, setRegular] = useState('');
  const [inputReason, setReason] = useState('');
  const options = [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
  ];
  function boolean(value: string) {
    if (!value) throw new Error('Review all leave-type flags explicitly.');
    return value === 'true';
  }
  return (
    <MutationForm
      title="Create explicit leave type"
      onSaved={onSaved}
      onCancel={onCancel}
      build={() => ({
        path: '/hr/leave-settings/types',
        method: 'POST',
        schema: leaveType,
        body: leaveTypeInput.parse({
          code,
          name,
          kind: kind ? Number(kind) : null,
          requiresEvidence: boolean(evidence),
          requiresAdvanceApproval: boolean(advance),
          reducesRegularBalance: boolean(regular),
          reason: inputReason,
        }),
      })}
    >
      <div className="attendance-grid">
        <TextInput
          label="Code"
          required
          maxLength={40}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <TextInput
          label="Name"
          required
          maxLength={200}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <Choice
        label="Kind"
        value={kind}
        options={kindNames.map((label, i) => ({ value: String(i), label }))}
        onChange={setKind}
      />
      <Choice label="Requires evidence" value={evidence} options={options} onChange={setEvidence} />
      <Choice
        label="Requires advance approval"
        value={advance}
        options={options}
        onChange={setAdvance}
      />
      <Choice
        label="Reduces regular balance"
        value={regular}
        options={options}
        onChange={setRegular}
      />
      <TextInput
        label="Reason"
        maxLength={1000}
        required
        value={inputReason}
        onChange={(e) => setReason(e.target.value)}
      />
    </MutationForm>
  );
}
function LeavePolicyForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [paid, setPaid] = useState<number[]>([]);
  const [paidReviewed, setPaidReviewed] = useState(false);
  const update = (key: string, value: string) =>
    setFields((current) => ({ ...current, [key]: value }));
  return (
    <MutationForm
      title="Publish explicit leave settings"
      onSaved={onSaved}
      onCancel={onCancel}
      submitLabel="Publish directly"
      build={() => {
        if (!paidReviewed)
          throw new Error(
            'Confirm the paid-kind selection, including an explicit empty selection.',
          );
        const ids = (fields.eligibleStaffCategoryIds ?? '').split(/[\s,]+/).filter(Boolean);
        return {
          path: '/hr/leave-settings/policies',
          method: 'POST',
          schema: leavePolicy,
          body: leavePolicyInput.parse({
            code: fields.code,
            name: fields.name,
            effectiveFrom: fields.effectiveFrom,
            effectiveTo: fields.effectiveTo,
            reason: fields.reason,
            settings: {
              settingsVersion: 2,
              yearStartMonth: Number(fields.yearStartMonth),
              yearStartDay: Number(fields.yearStartDay),
              annualDays: Number(fields.annualDays),
              sickDays: Number(fields.sickDays),
              casualDays: Number(fields.casualDays),
              minimumServiceMonths: Number(fields.minimumServiceMonths),
              standardDayMinutes: Number(fields.standardDayMinutes),
              eligibleStaffCategoryIds: ids,
              holidayCalendarId: fields.holidayCalendarId,
              holidayTreatment: Number(fields.holidayTreatment),
              paidKinds: paid,
            },
          }),
        };
      }}
    >
      <div className="attendance-grid">
        {['code', 'name'].map((key) => (
          <TextInput
            key={key}
            label={key === 'code' ? 'Unique policy code' : 'Policy name'}
            required
            maxLength={key === 'code' ? 40 : 200}
            value={fields[key] ?? ''}
            onChange={(e) => update(key, e.target.value)}
          />
        ))}
        <TextInput
          label="Effective from"
          type="date"
          required
          value={fields.effectiveFrom ?? ''}
          onChange={(e) => update('effectiveFrom', e.target.value)}
        />
        <TextInput
          label="Exclusive end"
          type="date"
          required
          value={fields.effectiveTo ?? ''}
          onChange={(e) => update('effectiveTo', e.target.value)}
        />
        {[
          ['annualDays', 'Annual days'],
          ['sickDays', 'Sick days'],
          ['casualDays', 'Casual days'],
          ['minimumServiceMonths', 'Minimum service months'],
          ['standardDayMinutes', 'Standard day minutes'],
        ].map(([key, label]) => (
          <TextInput
            key={key}
            label={label!}
            type="number"
            min={key === 'standardDayMinutes' ? 1 : 0}
            max={key === 'standardDayMinutes' ? 1440 : undefined}
            step={1}
            required
            value={fields[key!] ?? ''}
            onChange={(e) => update(key!, e.target.value)}
          />
        ))}
        <Choice
          label="Leave year starting month"
          value={fields.yearStartMonth ?? ''}
          options={[
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
          ].map((label, index) => ({ value: String(index + 1), label }))}
          onChange={(value) => update('yearStartMonth', value)}
        />
        <TextInput
          label="Leave year starting day"
          type="number"
          min={1}
          max={31}
          step={1}
          required
          value={fields.yearStartDay ?? ''}
          onChange={(event) => update('yearStartDay', event.target.value)}
        />
      </div>
      <TextInput
        label="Eligible staff category IDs (comma separated)"
        required
        value={fields.eligibleStaffCategoryIds ?? ''}
        onChange={(e) => update('eligibleStaffCategoryIds', e.target.value)}
      />
      <TextInput
        label="Exact holiday calendar revision ID"
        required
        value={fields.holidayCalendarId ?? ''}
        onChange={(e) => update('holidayCalendarId', e.target.value)}
      />
      <Choice
        label="Holiday treatment"
        value={fields.holidayTreatment ?? ''}
        options={[
          { value: '1', label: 'Exclude' },
          { value: '2', label: 'Count' },
        ]}
        onChange={(v) => update('holidayTreatment', v)}
      />
      <h3>Paid kinds</h3>
      <div className="attendance-days">
        {kindNames.map((label, i) => (
          <label className="attendance-check" key={i}>
            <input
              type="checkbox"
              checked={paid.includes(i)}
              onChange={(e) => {
                setPaid((rows) => (e.target.checked ? [...rows, i] : rows.filter((n) => n !== i)));
                setPaidReviewed(false);
              }}
            />
            {label}
          </label>
        ))}
      </div>
      <label className="attendance-check">
        <input
          type="checkbox"
          checked={paidReviewed}
          onChange={(e) => setPaidReviewed(e.target.checked)}
        />
        Confirm paid-kind selection
      </label>
      <TextInput
        label="Publication reason"
        maxLength={1000}
        required
        value={fields.reason ?? ''}
        onChange={(e) => update('reason', e.target.value)}
      />
      <EvidenceRecord
        value={{
          leaveYearStartingMonth: fields.yearStartMonth || null,
          leaveYearStartingDay: fields.yearStartDay || null,
          paidKinds: paid.map((i) => kindNames[i]),
          holidayCalendarRevisionId: fields.holidayCalendarId ?? null,
        }}
      />
    </MutationForm>
  );
}
