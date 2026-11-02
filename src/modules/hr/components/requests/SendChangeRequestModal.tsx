import { formatEmployeeCode } from '@/utils/employee-code';
import { useState, useMemo } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Send,
  X,
  ShieldCheck,
  Briefcase,
  CreditCard,
  HeartPulse,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useHrAccess } from '../../hooks/use-hr-access';
import { Denied } from '../Feedback';
import { useHrQuery } from '../../hooks/use-hr-queries';
import { employeeSchema, pageOf } from '../../schemas/contracts';
import { currentUpdateSchema } from '../../schemas/updates';
import { sections, type Section, type SectionName } from '../../types/updates';
import { ChangeForm } from '../employee/ChangeForm';
import '@/styles/hr-requests.css';

const selectableSections = sections;

export function SendChangeRequestModal({
  open,
  onClose,
  initialSection = 'identity',
  initialEmployeeId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  initialSection?: string;
  initialEmployeeId?: string;
  onSuccess: (section: SectionName) => void;
}) {
  const access = useHrAccess();
  const allowedSections = selectableSections.filter((section) =>
    access.can('hr.employees.read', ...section.read, ...section.write),
  );
  const [selectedEmpId, setSelectedEmpId] = useState<string>(initialEmployeeId ?? '');
  const [selectedSectionName, setSelectedSectionName] = useState<SectionName>(
    (selectableSections.some((s) => s.name === initialSection)
      ? initialSection
      : 'identity') as SectionName,
  );

  // Current-value proposals require approved onboarding.
  const employeesQuery = useHrQuery(
    'employees?pageSize=100&status=2',
    pageOf(employeeSchema),
    ['hr.employees.read'],
    open,
  );

  const activeSection = useMemo<Section>(() => {
    return (
      allowedSections.find((s) => s.name === selectedSectionName) ??
      allowedSections[0] ??
      selectableSections[0]!
    );
  }, [selectedSectionName, allowedSections]);

  // Set default employee if not set yet
  const employees = employeesQuery.data?.items ?? [];
  const currentEmpId = selectedEmpId || (employees.length > 0 ? (employees[0]?.id ?? '') : '');

  // Query current record for selected employee & section
  const currentRecordQuery = useHrQuery(
    `employees/${currentEmpId}/current/${activeSection.name}`,
    currentUpdateSchema,
    ['hr.employees.read', ...activeSection.read],
    Boolean(
      open &&
      currentEmpId &&
      access.can('hr.employees.read', ...activeSection.read, ...activeSection.write),
    ),
  );

  const getSectionIcon = (name: string) => {
    switch (name) {
      case 'identity':
        return <ShieldCheck size={14} />;
      case 'employment':
        return <Briefcase size={14} />;
      case 'bank':
        return <CreditCard size={14} />;
      case 'medical':
        return <HeartPulse size={14} />;
      case 'documents':
        return <FileText size={14} />;
      default:
        return <FileText size={14} />;
    }
  };

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
          style={{ maxWidth: '820px', width: '95vw' }}
        >
          {/* Modal Header */}
          <div
            className="org-modal-header"
            style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0' }}
          >
            <div className="org-modal-header-left">
              <div
                className="org-modal-icon-badge"
                style={{
                  background: '#eff6ff',
                  color: '#2563eb',
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Send size={18} />
              </div>
              <div className="org-modal-titles">
                <DialogPrimitive.Title
                  className="org-modal-title"
                  style={{ fontSize: '16px', fontWeight: 750, color: '#0f172a' }}
                >
                  Send Employee Change Request for Admin Approval
                </DialogPrimitive.Title>
                <p
                  className="org-modal-desc"
                  style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0' }}
                >
                  Submit an auditable modification request for employee records to enter the admin
                  authorization queue.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="org-modal-close-btn"
              aria-label="Close dialog"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Configuration Strip: Select Employee & Change Category */}
          <div
            style={{
              padding: '12px 18px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {/* Step 1: Employee Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <label
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#475569',
                  minWidth: '100px',
                }}
              >
                1. Select Staff:
              </label>
              <div style={{ flex: '1 1 280px', maxWidth: '480px' }}>
                <select
                  value={currentEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  style={{
                    width: '100%',
                    height: '32px',
                    fontSize: '12px',
                    padding: '0 8px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontWeight: 500,
                  }}
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      [{formatEmployeeCode(emp.employeeNumber)}]{emp.name || 'Unnamed Staff'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 2: Change Category Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <label
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#475569',
                  minWidth: '100px',
                }}
              >
                2. Category:
              </label>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {allowedSections.map((sec) => {
                  const isActive = sec.name === activeSection.name;
                  return (
                    <button
                      key={sec.name}
                      type="button"
                      onClick={() => setSelectedSectionName(sec.name)}
                      style={{
                        height: '26px',
                        padding: '0 10px',
                        borderRadius: '13px',
                        fontSize: '11px',
                        fontWeight: isActive ? 650 : 500,
                        background: isActive ? '#2563eb' : '#ffffff',
                        color: isActive ? '#ffffff' : '#334155',
                        border: `1px solid ${isActive ? '#2563eb' : '#cbd5e1'}`,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      {getSectionIcon(sec.name)}
                      <span>{sec.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Form Content Body */}
          <div style={{ padding: '0 18px 16px' }}>
            {!access.can('hr.employees.read', ...activeSection.read, ...activeSection.write) ? (
              <Denied />
            ) : currentRecordQuery.isLoading ? (
              <div
                style={{
                  padding: '36px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#64748b',
                }}
              >
                <Loader2 size={24} className="animate-spin" style={{ color: '#2563eb' }} />
                <span style={{ fontSize: '12px' }}>
                  Loading current employee {activeSection.label.toLowerCase()} record...
                </span>
              </div>
            ) : currentRecordQuery.isError || !currentRecordQuery.data ? (
              <div
                style={{
                  margin: '18px 0',
                  padding: '16px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#dc2626',
                  fontSize: '12px',
                }}
              >
                <AlertCircle size={18} />
                <span>
                  Could not load current records for this employee. Ensure the selected staff has a
                  valid active status.
                </span>
              </div>
            ) : (
              <ChangeForm
                key={`${currentEmpId}-${activeSection.name}-${currentRecordQuery.data.version}`}
                current={currentRecordQuery.data}
                section={activeSection}
                onSaved={() => {
                  onSuccess(activeSection.name);
                  onClose();
                }}
                onCancel={onClose}
              />
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
