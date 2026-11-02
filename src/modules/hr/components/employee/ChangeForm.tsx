import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Pencil, Send, X } from 'lucide-react';
import { TextInput } from '@/components/forms/TextInput';
import { useHrAccess } from '../../hooks/use-hr-access';
import { useHrAction, useHrQuery } from '../../hooks/use-hr-queries';
import { useDirtyForm } from '../../hooks/use-dirty-form';
import { documentsSchema } from '../../schemas/hiring';
import { id, writeResult } from '../../schemas/contracts';
import type { CurrentUpdate, Section, UpdateData } from '../../types/updates';
import {
  AddressFields,
  BankFields,
  DocumentChoice,
  EmergencyFields,
  EnumField,
  Field,
  PhoneField,
  FormSection,
  LongField,
} from '../hiring/FormFields';
import { ReferenceField } from '../ReferenceField';
import { ActionMessage, Denied } from '../Feedback';
import { formatCnic } from '../../utils/identity';
import { profileDraftChanged } from '../../utils/profile-draft';

const changeRequestWriteResult = writeResult.extend({ changeRequestId: id });

export function ChangeFormModal({
  open,
  onClose,
  current,
  readPending,
  section,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  current: CurrentUpdate;
  readPending?: boolean;
  section: Section;
  onSaved: () => void;
}) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="org-modal-overlay" />
        <DialogPrimitive.Content
          className="org-modal-content org-modal-wide change-form-modal"
          aria-describedby={undefined}
        >
          <div className="org-modal-header">
            <div className="org-modal-header-left">
              <div className="org-modal-icon-badge">
                <Pencil size={19} />
              </div>
              <div className="org-modal-titles">
                <DialogPrimitive.Title className="org-modal-title">
                  {section.name === 'basic'
                    ? 'Propose Personal Details Change'
                    : `Propose Changes: ${section.label}`}
                </DialogPrimitive.Title>
                <p className="org-modal-desc">
                  {section.name === 'basic'
                    ? 'Submit addresses, contact, and emergency information for independent Admin approval'
                    : 'Submit an auditable change request for employee records'}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="org-modal-close-btn"
              aria-label="Close dialog"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>

          <ChangeForm
            current={current}
            readPending={readPending}
            section={section}
            onSaved={() => {
              onSaved();
              onClose();
            }}
            onCancel={onClose}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ChangeForm({
  current: latest,
  readPending = false,
  section,
  onSaved,
  onCancel,
}: {
  current: CurrentUpdate;
  readPending?: boolean;
  section: Section;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const access = useHrAccess();
  // An open proposal retains the record and concurrency token the editor saw.
  const [opened] = useState(latest);
  const rolloverSection = section.name === 'employment' || section.name === 'bank';
  const current = rolloverSection ? opened : latest;
  const stale = rolloverSection && profileDraftChanged(current, latest);
  const [data, setData] = useState<UpdateData>(() => ({
    [section.name]:
      current.current.data[section.name] ??
      (section.name === 'bank'
        ? { bankName: null, accountTitle: null, accountNumber: null, iban: null }
        : section.name === 'medical'
          ? { details: null, authorizationReference: null, supportingDocumentId: null }
          : section.name === 'documents'
            ? { documentIds: [] }
            : null),
  }));
  const [baseline, setBaseline] = useState(JSON.stringify(data));
  const [reason, setReason] = useState<string | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [sent, setSent] = useState(false);
  const repairsIdentityEvidence =
    section.name === 'identity' &&
    current.evidenceIssue === 'identity_document_evidence_unavailable';
  const [repairAcknowledged, setRepairAcknowledged] = useState(false);
  const action = useHrAction();
  useDirtyForm(!sent && (JSON.stringify(data) !== baseline || !!reason || !!effectiveFrom));
  const documents = useHrQuery(
    `employees/${current.employeeId}/documents${section.name === 'medical' ? '?medical=true' : ''}`,
    documentsSchema,
    [
      'hr.employees.read',
      'hr.employees.documents.read',
      ...(section.name === 'medical' ? ['hr.employees.medical.read'] : []),
    ],
    ['identity', 'medical', 'documents'].includes(section.name),
  );
  const set = <K extends keyof UpdateData>(key: K, value: UpdateData[K]) =>
    setData({ [key]: value });
  if (!access.can('hr.employees.read', ...section.read, ...section.write)) return <Denied />;
  if (!data[section.name])
    return (
      <p role="alert" className="hr-message hr-message--error">
        Current {section.label.toLowerCase()} are unavailable. A valid current record is required
        before a change can be proposed.
      </p>
    );
  return (
    <form
      className="org-modal-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (
          action.pending ||
          (rolloverSection && profileDraftChanged(current, latest)) ||
          readPending ||
          sent ||
          !reason?.trim() ||
          (repairsIdentityEvidence && !repairAcknowledged)
        )
          return;
        void (async () => {
          const body = {
            section: section.number,
            expectedVersion: current.version,
            data,
            effectiveFrom: section.dated ? effectiveFrom : null,
            reason: reason.trim(),
            ...(section.name === 'identity'
              ? { repairIdentityEvidence: repairsIdentityEvidence && repairAcknowledged }
              : {}),
          };
          const result = await action.run(
            `employees/${current.employeeId}/change-requests`,
            body,
            'POST',
            changeRequestWriteResult,
          );
          if (result) {
            setBaseline(JSON.stringify(data));
            setSent(true);
            onSaved();
          }
        })();
      }}
    >
      <div
        className="org-modal-body-scroll org-modal-fields"
        style={{ maxHeight: 'calc(85vh - 170px)' }}
      >
        <fieldset
          disabled={action.pending || sent}
          className="org-modal-fieldset"
          style={{ border: 'none', padding: 0, margin: 0 }}
        >
          {repairsIdentityEvidence && (
            <label className="hr-message">
              <input
                type="checkbox"
                required
                checked={repairAcknowledged}
                onChange={(e) => setRepairAcknowledged(e.target.checked)}
              />{' '}
              Request identity evidence repair. I acknowledge the old proof is unavailable. A
              verified replacement document and independent Admin approval are required; the
              original history will remain unchanged.
            </label>
          )}
          {data.basic && (
            <>
              <AddressFields
                label="Current address"
                required
                value={data.basic.currentAddress}
                onChange={(v) => set('basic', { ...data.basic!, currentAddress: v })}
              />
              <AddressFields
                label="Permanent address"
                required
                value={data.basic.permanentAddress}
                onChange={(v) => set('basic', { ...data.basic!, permanentAddress: v })}
              />
              <EmergencyFields
                required
                value={data.basic.emergencyContact}
                onChange={(v) => set('basic', { ...data.basic!, emergencyContact: v })}
              />
              <FormSection title="Basic contact details">
                <Field
                  label="Personal email"
                  type="email"
                  max={320}
                  value={data.basic.personalEmail}
                  onChange={(v) => set('basic', { ...data.basic!, personalEmail: v })}
                />
                <Field
                  label="Marital status"
                  max={40}
                  value={data.basic.maritalStatus}
                  onChange={(v) => set('basic', { ...data.basic!, maritalStatus: v })}
                />
              </FormSection>
            </>
          )}
          {data.identity && (
            <FormSection title="Proposed identity">
              <Field
                label="Full legal name"
                required
                value={data.identity.fullLegalName}
                onChange={(v) => set('identity', { ...data.identity!, fullLegalName: v ?? '' })}
              />
              <Field
                label="Father or spouse name"
                value={data.identity.fatherOrSpouseName}
                onChange={(v) => set('identity', { ...data.identity!, fatherOrSpouseName: v })}
              />
              <EnumField
                label="Identity document type"
                required
                options={['CNIC', 'Passport']}
                value={data.identity.identityDocumentType}
                onChange={(v) => {
                  const newType = v ?? 0;
                  let num = data.identity!.identityDocumentNumber;
                  if (newType !== 2 && num) {
                    num = formatCnic(num);
                  }
                  set('identity', {
                    ...data.identity!,
                    identityDocumentType: newType,
                    identityDocumentNumber: num,
                  });
                }}
              />
              <Field
                label="Identity document number"
                required
                placeholder={
                  data.identity.identityDocumentType === 2 ? 'Passport Number' : '42101-1234567-1'
                }
                max={data.identity.identityDocumentType === 2 ? 20 : 15}
                value={data.identity.identityDocumentNumber}
                onChange={(v) => {
                  const isPassport = data.identity!.identityDocumentType === 2;
                  const val = !isPassport && v ? formatCnic(v) : (v ?? '');
                  set('identity', { ...data.identity!, identityDocumentNumber: val });
                }}
              />
              <Field
                label="Identity expiry date"
                type="date"
                value={data.identity.identityDocumentExpiresOn}
                onChange={(v) =>
                  set('identity', { ...data.identity!, identityDocumentExpiresOn: v })
                }
              />
              <Field
                label="Date of birth"
                type="date"
                required
                value={data.identity.dateOfBirth}
                onChange={(v) => set('identity', { ...data.identity!, dateOfBirth: v ?? '' })}
              />
              <Field
                label="Gender"
                max={40}
                value={data.identity.gender}
                onChange={(v) => set('identity', { ...data.identity!, gender: v })}
              />
              <PhoneField
                label="Personal contact phone"
                required
                value={data.identity.personalPhone}
                onChange={(v) => set('identity', { ...data.identity!, personalPhone: v ?? '' })}
              />
              <PhoneField
                label="Company contact phone"
                value={data.identity.companyPhone}
                onChange={(v) => set('identity', { ...data.identity!, companyPhone: v })}
              />
              <Field
                label="Official contact email"
                type="email"
                max={320}
                value={data.identity.officialEmail}
                onChange={(v) => set('identity', { ...data.identity!, officialEmail: v })}
              />
              <DocumentChoice
                label="Identity evidence"
                documents={(documents.data ?? []).filter((d) => d.type === 3 && d.isAvailable)}
                value={data.identity.identityDocumentId}
                onChange={(v) =>
                  set('identity', { ...data.identity!, identityDocumentId: v ?? '' })
                }
              />
            </FormSection>
          )}
          {data.employment && (
            <FormSection title="Proposed employment">
              <ReferenceField
                label="Department"
                required
                kind="departments"
                value={data.employment.departmentId}
                onChange={(v) => set('employment', { ...data.employment!, departmentId: v ?? '' })}
              />
              <ReferenceField
                label="Designation"
                required
                kind="designations"
                value={data.employment.designationId}
                onChange={(v) => set('employment', { ...data.employment!, designationId: v ?? '' })}
              />
              <ReferenceField
                label="Reporting manager"
                required
                kind="employees"
                excludeId={current.employeeId}
                value={data.employment.reportingManagerEmployeeId}
                onChange={(v) =>
                  set('employment', { ...data.employment!, reportingManagerEmployeeId: v })
                }
              />
              {current.current.data.employment?.branchId && (
                <ReferenceField
                  label="Office"
                  required
                  kind="branches"
                  value={data.employment.branchId}
                  onChange={(v) => set('employment', { ...data.employment!, branchId: v })}
                />
              )}
            </FormSection>
          )}
          {data.bank && <BankFields value={data.bank} onChange={(v) => set('bank', v)} />}
          {data.medical && (
            <FormSection title="Proposed medical details">
              <LongField
                label="Medical details"
                required
                max={10000}
                value={data.medical.details}
                onChange={(v) => set('medical', { ...data.medical!, details: v })}
              />
              <Field
                label="Medical authorization reference"
                required
                max={500}
                value={data.medical.authorizationReference}
                onChange={(v) => set('medical', { ...data.medical!, authorizationReference: v })}
              />
              <DocumentChoice
                label="Private medical evidence"
                documents={(documents.data ?? []).filter((d) => d.isAvailable)}
                value={data.medical.supportingDocumentId}
                onChange={(v) => set('medical', { ...data.medical!, supportingDocumentId: v })}
              />
            </FormSection>
          )}
          {data.documents && (
            <section className="hr-form-section">
              <h2>Proposed standard documents</h2>
              {(documents.data ?? []).map((d) => (
                <label className="hr-check" key={d.id}>
                  <input
                    type="checkbox"
                    disabled={!d.isAvailable && !data.documents?.documentIds.includes(d.id)}
                    checked={data.documents?.documentIds.includes(d.id)}
                    onChange={(e) =>
                      set('documents', {
                        documentIds: e.target.checked
                          ? [...data.documents!.documentIds, d.id]
                          : data.documents!.documentIds.filter((x) => x !== d.id),
                      })
                    }
                  />
                  {d.fileName} {!d.isAvailable && '(unavailable)'}
                </label>
              ))}
            </section>
          )}
          {documents.isError && ['identity', 'medical', 'documents'].includes(section.name) && (
            <p role="alert">Evidence documents could not be loaded.</p>
          )}
          <FormSection title="Change request">
            {section.dated && (
              <TextInput
                label="Effective from"
                type="date"
                required
                min={current.asOf}
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
              />
            )}
            <LongField
              label="Reason for change"
              required
              max={1000}
              value={reason}
              onChange={setReason}
            />
          </FormSection>
        </fieldset>
      </div>

      <div className="org-modal-footer">
        {onCancel && (
          <button
            type="button"
            className="org-btn-cancel"
            disabled={action.pending}
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="org-btn-submit"
          disabled={!reason?.trim() || action.pending || sent || stale || readPending}
        >
          <Send size={15} />
          Submit change request
        </button>
      </div>

      {stale && (
        <p role="status">
          The current record changed. Close and reopen this proposal to review the new values.
        </p>
      )}
      <ActionMessage
        action={{
          error: action.error,
          success: sent
            ? 'Change request submitted for Admin review. Current details remain unchanged until approval.'
            : null,
        }}
      />
    </form>
  );
}
