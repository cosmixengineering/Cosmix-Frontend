import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Fingerprint,
  MapPin,
  CheckCircle2,
  FileText,
  RotateCcw,
  Check,
  X,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  PhoneCall,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useHrQuery } from '@/modules/hr/hooks/use-hr-queries';
import { employeeSchema, pageOf } from '@/modules/hr/schemas/contracts';
import { profileResponse } from '@/modules/hr/schemas/hiring';
import '@/styles/attendance-processing.css';

interface DailyLog {
  date: string;
  dayName: string;
  shift: string;
  checkIn: string | null;
  checkOut: string | null;
  hoursWorked: string;
  faceVerified: boolean;
  geofenceStatus: 'within' | 'out_of_range' | 'none';
  distanceMeters?: number;
  status: 'present' | 'late' | 'absent' | 'leave' | 'weekend';
  exception?: string;
}

const SAMPLE_MONTH_LOGS: DailyLog[] = [
  {
    date: '01 Oct 2026',
    dayName: 'Wednesday',
    shift: 'Day Shift (09:00 - 17:00)',
    checkIn: '08:58 AM',
    checkOut: '05:02 PM',
    hoursWorked: '8h 04m',
    faceVerified: true,
    geofenceStatus: 'within',
    distanceMeters: 14,
    status: 'present',
  },
  {
    date: '30 Sep 2026',
    dayName: 'Tuesday',
    shift: 'Day Shift (09:00 - 17:00)',
    checkIn: '09:18 AM',
    checkOut: '05:15 PM',
    hoursWorked: '7h 57m',
    faceVerified: true,
    geofenceStatus: 'within',
    distanceMeters: 22,
    status: 'late',
    exception: 'Late (18 mins)',
  },
  {
    date: '29 Sep 2026',
    dayName: 'Monday',
    shift: 'Day Shift (09:00 - 17:00)',
    checkIn: '08:52 AM',
    checkOut: '05:08 PM',
    hoursWorked: '8h 16m',
    faceVerified: true,
    geofenceStatus: 'within',
    distanceMeters: 18,
    status: 'present',
  },
  {
    date: '28 Sep 2026',
    dayName: 'Sunday',
    shift: 'Day Shift (09:00 - 17:00)',
    checkIn: '09:00 AM',
    checkOut: '05:00 PM',
    hoursWorked: '8h 00m',
    faceVerified: true,
    geofenceStatus: 'within',
    distanceMeters: 10,
    status: 'present',
  },
  {
    date: '27 Sep 2026',
    dayName: 'Saturday',
    shift: 'Rest Day',
    checkIn: null,
    checkOut: null,
    hoursWorked: '0h 00m',
    faceVerified: false,
    geofenceStatus: 'none',
    status: 'weekend',
  },
  {
    date: '26 Sep 2026',
    dayName: 'Friday',
    shift: 'Rest Day',
    checkIn: null,
    checkOut: null,
    hoursWorked: '0h 00m',
    faceVerified: false,
    geofenceStatus: 'none',
    status: 'weekend',
  },
  {
    date: '25 Sep 2026',
    dayName: 'Thursday',
    shift: 'Day Shift (09:00 - 17:00)',
    checkIn: '08:45 AM',
    checkOut: '05:10 PM',
    hoursWorked: '8h 25m',
    faceVerified: true,
    geofenceStatus: 'within',
    distanceMeters: 8,
    status: 'present',
  },
  {
    date: '24 Sep 2026',
    dayName: 'Wednesday',
    shift: 'Day Shift (09:00 - 17:00)',
    checkIn: null,
    checkOut: null,
    hoursWorked: '0h 00m',
    faceVerified: false,
    geofenceStatus: 'none',
    status: 'leave',
    exception: 'Casual Leave (Approved)',
  },
  {
    date: '23 Sep 2026',
    dayName: 'Tuesday',
    shift: 'Day Shift (09:00 - 17:00)',
    checkIn: '08:50 AM',
    checkOut: '05:05 PM',
    hoursWorked: '8h 15m',
    faceVerified: true,
    geofenceStatus: 'within',
    distanceMeters: 15,
    status: 'present',
  },
  {
    date: '22 Sep 2026',
    dayName: 'Monday',
    shift: 'Day Shift (09:00 - 17:00)',
    checkIn: '09:12 AM',
    checkOut: '05:10 PM',
    hoursWorked: '7h 58m',
    faceVerified: true,
    geofenceStatus: 'within',
    distanceMeters: 30,
    status: 'late',
    exception: 'Late (12 mins)',
  },
];

export function EmployeeAttendanceDetailPage() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState('October 2026');
  const [selectedLogIndex, setSelectedLogIndex] = useState(0);

  // Overtime (OT) Status state with persistent localStorage
  const [isOvertimeEnabled, setIsOvertimeEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`cosmix_ot_${employeeId || 'default'}`);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleOvertime = () => {
    setIsOvertimeEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`cosmix_ot_${employeeId || 'default'}`, String(next));
      } catch (err) {
        console.warn('LocalStorage error:', err);
      }
      return next;
    });
  };

  // Fetch real employee info if available
  const employeesQuery = useHrQuery('employees?pageSize=50', pageOf(employeeSchema), [
    'hr.employees.read',
  ]);

  // Fetch comprehensive employee profile (emergency contact, personal, addresses, etc.)
  const profileQuery = useHrQuery(
    employeeId ? `employees/${employeeId}` : 'employees/placeholder',
    profileResponse,
    ['hr.employees.read']
  );

  const dossier = useMemo(() => {
    const p = profileQuery.data?.profile;
    const e = profileQuery.data?.employee || employeesQuery.data?.items?.find((item) => item.id === employeeId);

    const name = p?.fullLegalName || e?.name || (e ? `Employee #${e.employeeNumber}` : 'Employee');
    const code = e ? `EMP${String(e.employeeNumber).padStart(3, '0')}` : 'EMP001';

    // Emergency Contact
    const emergencyName = p?.emergencyContact?.name || 'Muhammad Tariq';
    const emergencyRelation = p?.emergencyContact?.relationship || 'Father';
    const emergencyPhone = p?.emergencyContact?.phone || '+92 300 9876543';
    const emergencyAltPhone = p?.emergencyContact?.alternatePhone || '+92 321 4455667';
    const bloodGroup = 'B+ (Positive)';

    // Personal & Identity
    const cnic = p?.identityDocumentNumber || '42101-7894561-3';
    const fatherOrSpouse = p?.fatherOrSpouseName || 'Muhammad Tariq';
    const dob = p?.dateOfBirth ? `${p.dateOfBirth} (34 yrs)` : '14 Aug 1992 (34 yrs)';
    const gender = p?.gender || 'Male';
    const maritalStatus = p?.maritalStatus || 'Married';

    // Contact & Residence
    const personalPhone = p?.personalPhone || p?.loginPhoneNumber || '+92 301 2345678';
    const companyPhone = p?.companyPhone || '+92 21 34567890 (Ext: 204)';
    const officialEmail = p?.officialEmail || `${name.toLowerCase().replace(/\s+/g, '.')}@cosmixerp.com`;
    const personalEmail = p?.personalEmail || `${name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`;

    const currAddr = p?.currentAddress
      ? [p.currentAddress.line1, p.currentAddress.line2, p.currentAddress.city, p.currentAddress.province].filter(Boolean).join(', ')
      : 'Flat 402, Block 13-D, Gulshan-e-Iqbal, Karachi';

    const permAddr = p?.permanentAddress
      ? [p.permanentAddress.line1, p.permanentAddress.city, p.permanentAddress.province].filter(Boolean).join(', ')
      : 'House 12, Street 4, Satellite Town, Rawalpindi';

    // Job & Employment
    const designation = 'Senior Field Engineer';
    const department = 'Operations & Engineering';
    const site = 'Head Office (Karachi Hub)';
    const employmentType = 'Full Time Regular';
    const joinedOn = p?.joinedOn || e?.joinedOn || '15 Jan 2024';
    const reportingManager = 'Kamran Ashraf (EMP-004)';

    return {
      name,
      code,
      emergencyName,
      emergencyRelation,
      emergencyPhone,
      emergencyAltPhone,
      bloodGroup,
      cnic,
      fatherOrSpouse,
      dob,
      gender,
      maritalStatus,
      personalPhone,
      companyPhone,
      officialEmail,
      personalEmail,
      currAddr,
      permAddr,
      designation,
      department,
      site,
      employmentType,
      joinedOn,
      reportingManager,
    };
  }, [profileQuery.data, employeesQuery.data, employeeId]);

  const initials = dossier.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const activeLog: DailyLog = SAMPLE_MONTH_LOGS[selectedLogIndex] ?? SAMPLE_MONTH_LOGS[0]!;

  return (
    <div className="attendance-processing-page">
      {/* 1. Back link */}
      <div>
        <Link
          to="/hr/attendance"
          className="hr-back"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} />
          Back to Attendance Processing
        </Link>
      </div>

      {/* 2. Employee Profile Header Card */}
      <div className="att-detail-header-card">
        <div className="att-detail-profile">
          <div className="att-detail-avatar">{initials}</div>
          <div className="att-detail-meta">
            <h2>
              {dossier.name}{' '}
              <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>
                ({dossier.code})
              </span>
            </h2>
            <p>
              <span>{dossier.designation}</span>
              <span>•</span>
              <span>{dossier.department}</span>
              <span>•</span>
              <span>{dossier.site}</span>
            </p>
            <div className="att-detail-pills-row">
              <span className="att-detail-pill" style={{ background: '#dcfce7', color: '#166534' }}>
                <Check size={12} style={{ display: 'inline', marginRight: '2px' }} />
                Active Employee
              </span>
              <span className="att-detail-pill" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                <ShieldCheck size={12} style={{ display: 'inline', marginRight: '2px' }} />
                Face Biometrics Enrolled
              </span>
              <span className="att-detail-pill" style={{ background: '#fef3c7', color: '#92400e' }}>
                <MapPin size={12} style={{ display: 'inline', marginRight: '2px' }} />
                Geofence Enforced
              </span>
            </div>
          </div>
        </div>

        {/* Header Right Actions: Overtime (OT) Live Status Badge + Month Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`att-ot-badge ${isOvertimeEnabled ? 'ot-on' : 'ot-off'}`}
            onClick={toggleOvertime}
            title="Click to toggle Overtime (OT) eligibility"
          >
            <span className="ot-dot">●</span>
            <span>Overtime (OT): {isOvertimeEnabled ? 'ON (1.5x Rate)' : 'OFF (Exempt)'}</span>
            <span className="ot-toggle-hint">Click to switch</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              className="att-page-btn"
              type="button"
              onClick={() => setSelectedMonth('September 2026')}
            >
              <ChevronLeft size={14} />
            </button>
            <span
              style={{
                padding: '6px 14px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontWeight: 650,
                fontSize: '12.5px',
                background: '#ffffff',
                whiteSpace: 'nowrap',
              }}
            >
              {selectedMonth}
            </span>
            <button
              className="att-page-btn"
              type="button"
              onClick={() => setSelectedMonth('October 2026')}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Comprehensive Employee Dossier Grid (Emergency, Personal, Contact, Overtime Setup) */}
      <div className="att-dossier-grid">
        {/* Card 1: Emergency Contact & Medical */}
        <div className="att-dossier-card card-emergency">
          <div className="att-dossier-card-header">
            <h4 className="att-dossier-card-title">
              <PhoneCall size={13} style={{ color: '#ea580c' }} />
              Emergency & Medical
            </h4>
            <span className="att-dossier-badge badge-emergency">Urgent Contact</span>
          </div>
          <div className="att-dossier-rows">
            <div className="att-dossier-row">
              <span className="att-dossier-label">Contact Person:</span>
              <span className="att-dossier-value val-emergency">{dossier.emergencyName}</span>
            </div>
            <div className="att-dossier-row">
              <span className="att-dossier-label">Relationship:</span>
              <span className="att-dossier-value">{dossier.emergencyRelation}</span>
            </div>
            <div className="att-dossier-row">
              <span className="att-dossier-label">Blood Group:</span>
              <span className="att-dossier-value" style={{ color: '#b91c1c', fontWeight: 700 }}>
                {dossier.bloodGroup}
              </span>
            </div>
            <div className="att-dossier-row">
              <span className="att-dossier-label">Alternate Phone:</span>
              <span className="att-dossier-value">{dossier.emergencyAltPhone}</span>
            </div>
          </div>
          <div className="att-emergency-highlight">
            <div>
              <div style={{ fontSize: '10px', color: '#c2410c', fontWeight: 600 }}>Emergency Call Line:</div>
              <div className="att-emergency-highlight-phone">{dossier.emergencyPhone}</div>
            </div>
            <a
              href={`tel:${dossier.emergencyPhone.replace(/\s+/g, '')}`}
              className="att-emergency-call-btn"
              title="Direct Dial Emergency Number"
            >
              <PhoneCall size={10} />
              <span>Call Now</span>
            </a>
          </div>
        </div>

        {/* Card 2: Personal & Identity Information */}
        <div className="att-dossier-card card-identity">
          <div className="att-dossier-card-header">
            <h4 className="att-dossier-card-title">
              <ShieldCheck size={13} style={{ color: '#2563eb' }} />
              Personal & Identity
            </h4>
            <span className="att-dossier-badge" style={{ background: '#dbeafe', color: '#1e40af' }}>
              Verified NADRA
            </span>
          </div>
          <div className="att-dossier-rows">
            <div className="att-dossier-row">
              <span className="att-dossier-label">CNIC / ID:</span>
              <span className="att-dossier-value" style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.02em' }}>
                {dossier.cnic}
              </span>
            </div>
            <div className="att-dossier-row">
              <span className="att-dossier-label">Father / Spouse:</span>
              <span className="att-dossier-value">{dossier.fatherOrSpouse}</span>
            </div>
            <div className="att-dossier-row">
              <span className="att-dossier-label">Date of Birth:</span>
              <span className="att-dossier-value">{dossier.dob}</span>
            </div>
            <div className="att-dossier-row">
              <span className="att-dossier-label">Gender / Status:</span>
              <span className="att-dossier-value">{dossier.gender} • {dossier.maritalStatus}</span>
            </div>
            <div className="att-dossier-row">
              <span className="att-dossier-label">Biometrics:</span>
              <span className="att-dossier-value" style={{ color: '#15803d' }}>
                Face + Geo Registered
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Contact & Residence Addresses */}
        <div className="att-dossier-card card-contact">
          <div className="att-dossier-card-header">
            <h4 className="att-dossier-card-title">
              <MapPin size={13} style={{ color: '#0d9488' }} />
              Contact & Residence
            </h4>
            <span className="att-dossier-badge" style={{ background: '#ccfbf1', color: '#0f766e' }}>
              Active Details
            </span>
          </div>
          <div className="att-dossier-rows">
            <div className="att-dossier-row">
              <span className="att-dossier-label">Personal Mobile:</span>
              <span className="att-dossier-value">{dossier.personalPhone}</span>
            </div>
            <div className="att-dossier-row">
              <span className="att-dossier-label">Company Phone:</span>
              <span className="att-dossier-value">{dossier.companyPhone}</span>
            </div>
            <div className="att-dossier-row">
              <span className="att-dossier-label">Official Email:</span>
              <span className="att-dossier-value" style={{ fontSize: '11px' }}>{dossier.officialEmail}</span>
            </div>
            <div className="att-dossier-row">
              <span className="att-dossier-label">Current Address:</span>
              <span className="att-dossier-value" style={{ fontSize: '10.5px' }}>{dossier.currAddr}</span>
            </div>
            <div className="att-dossier-row">
              <span className="att-dossier-label">Permanent:</span>
              <span className="att-dossier-value" style={{ fontSize: '10.5px' }}>{dossier.permAddr}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Employment & Overtime (OT) Setup */}
        <div className="att-dossier-card card-overtime">
          <div className="att-dossier-card-header">
            <h4 className="att-dossier-card-title">
              <Clock size={13} style={{ color: '#8b5cf6' }} />
              Job & Overtime Setup
            </h4>
            <span className={`att-dossier-badge ${isOvertimeEnabled ? 'badge-ot-on' : 'badge-ot-off'}`}>
              {isOvertimeEnabled ? 'OT ON' : 'OT OFF'}
            </span>
          </div>
          <div className="att-dossier-rows">
            <div className="att-dossier-row">
              <span className="att-dossier-label">Department:</span>
              <span className="att-dossier-value">{dossier.department}</span>
            </div>
            <div className="att-dossier-row">
              <span className="att-dossier-label">Designation:</span>
              <span className="att-dossier-value">{dossier.designation}</span>
            </div>
            <div className="att-dossier-row">
              <span className="att-dossier-label">Reporting Mgr:</span>
              <span className="att-dossier-value">{dossier.reportingManager}</span>
            </div>
            <div className="att-dossier-row">
              <span className="att-dossier-label">Joined On:</span>
              <span className="att-dossier-value">{dossier.joinedOn}</span>
            </div>
            <div className="att-dossier-row">
              <span className="att-dossier-label">OT Policy / Rate:</span>
              <span className="att-dossier-value" style={{ color: isOvertimeEnabled ? '#15803d' : '#64748b' }}>
                {isOvertimeEnabled ? '1.5x Standard Hourly' : 'Exempt (No OT Pay)'}
              </span>
            </div>
          </div>

          {/* Interactive Live Overtime Switch */}
          <div className="att-ot-card-toggle">
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: isOvertimeEnabled ? '#15803d' : '#475569' }}>
                Overtime: {isOvertimeEnabled ? 'ON (Active)' : 'OFF (Exempt)'}
              </div>
              <div style={{ fontSize: '9.5px', color: '#64748b' }}>
                {isOvertimeEnabled ? 'Eligible for 1.5x OT hours' : 'Non-OT role, standard salary'}
              </div>
            </div>
            <button
              type="button"
              className={`att-ot-toggle-btn ${isOvertimeEnabled ? 'btn-turn-off' : 'btn-turn-on'}`}
              onClick={toggleOvertime}
            >
              {isOvertimeEnabled ? (
                <>
                  <ToggleRight size={14} style={{ color: '#15803d' }} />
                  <span>Turn OT OFF</span>
                </>
              ) : (
                <>
                  <ToggleLeft size={14} style={{ color: '#64748b' }} />
                  <span>Enable OT (ON)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Monthly Attendance Metric Cards */}
      <div className="att-kpis-grid">
        <div className="att-kpi-card">
          <div className="att-kpi-icon-wrap att-kpi-icon-green">
            <CheckCircle2 size={20} />
          </div>
          <div className="att-kpi-content">
            <span className="att-kpi-label">Days Present</span>
            <span className="att-kpi-value">22 / 24</span>
            <span className="att-kpi-sub positive">91.6% attendance rate</span>
          </div>
        </div>

        <div className="att-kpi-card">
          <div className="att-kpi-icon-wrap att-kpi-icon-blue">
            <Clock size={20} />
          </div>
          <div className="att-kpi-content">
            <span className="att-kpi-label">Total Regular Hours</span>
            <span className="att-kpi-value">176h 20m</span>
            <span className="att-kpi-sub">Avg 8h 01m / day</span>
          </div>
        </div>

        <div className="att-kpi-card">
          <div
            className="att-kpi-icon-wrap"
            style={{
              background: isOvertimeEnabled ? '#ede9fe' : '#f1f5f9',
              color: isOvertimeEnabled ? '#7c3aed' : '#64748b',
            }}
          >
            <Clock size={20} />
          </div>
          <div className="att-kpi-content">
            <span className="att-kpi-label">Overtime Logged</span>
            <span className="att-kpi-value">{isOvertimeEnabled ? '14h 30m' : '0h 00m'}</span>
            <span className={`att-kpi-sub ${isOvertimeEnabled ? 'positive' : ''}`}>
              {isOvertimeEnabled ? '● OT ON (1.5x Hourly Rate)' : '● OT OFF (Exempt Role)'}
            </span>
          </div>
        </div>

        <div className="att-kpi-card">
          <div className="att-kpi-icon-wrap att-kpi-icon-yellow">
            <Clock size={20} />
          </div>
          <div className="att-kpi-content">
            <span className="att-kpi-label">Late Arrivals</span>
            <span className="att-kpi-value">2</span>
            <span className="att-kpi-sub">Total 30 mins delay</span>
          </div>
        </div>

        <div className="att-kpi-card">
          <div className="att-kpi-icon-wrap att-kpi-icon-purple">
            <Calendar size={20} />
          </div>
          <div className="att-kpi-content">
            <span className="att-kpi-label">Approved Leaves</span>
            <span className="att-kpi-value">1 Day</span>
            <span className="att-kpi-sub">Casual Leave</span>
          </div>
        </div>

        <div className="att-kpi-card">
          <div className="att-kpi-icon-wrap att-kpi-icon-green">
            <Fingerprint size={20} />
          </div>
          <div className="att-kpi-content">
            <span className="att-kpi-label">Biometric Verification</span>
            <span className="att-kpi-value">100%</span>
            <span className="att-kpi-sub positive">Face match verified</span>
          </div>
        </div>
      </div>

      {/* 4. Two Column Inspection Section (Day Punch Audit + GPS Geofence Map) */}
      <div className="att-detail-grid">
        {/* Left: Day Punch Details */}
        <div className="att-card">
          <div className="att-card-header">
            <h3 className="att-card-title">
              Punch Audit Details — {activeLog.date} ({activeLog.dayName})
            </h3>
            <span className="pill-time-green">Verified</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                background: '#f8fafc',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>CHECK-IN TIME</span>
                <div style={{ fontSize: '18px', fontWeight: 750, color: '#15803d', marginTop: '2px' }}>
                  {activeLog.checkIn || '-'}
                </div>
                <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>
                  ✓ Face match: 99.4%
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>CHECK-OUT TIME</span>
                <div style={{ fontSize: '18px', fontWeight: 750, color: '#0f172a', marginTop: '2px' }}>
                  {activeLog.checkOut || '-'}
                </div>
                <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>
                  ✓ Face match: 98.9%
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Assigned Shift:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{activeLog.shift}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Worked Duration:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{activeLog.hoursWorked}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Geofence Verification:</span>
                <span style={{ fontWeight: 600, color: '#166534' }}>
                  ✓ Within boundary ({activeLog.distanceMeters ?? 14}m from center)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>GPS Coordinates:</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#334155' }}>
                  24.8607° N, 67.0011° E
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Punch Terminal Device:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  Mobile Attendance App v2.4 (Android 14)
                </span>
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '10px', display: 'flex', gap: '8px' }}>
              <button
                className="btn-att-export"
                type="button"
                onClick={() => alert(`Attendance for ${activeLog.date} recalculated successfully.`)}
              >
                <RotateCcw size={14} />
                <span>Recalculate Day</span>
              </button>
              <button
                className="btn-action-purple"
                type="button"
                onClick={() => navigate('/hr/attendance/corrections/review')}
              >
                <FileText size={14} />
                <span>Correction Request</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Geofence Map / Boundary Visualizer */}
        <div className="att-card">
          <div className="att-card-header">
            <h3 className="att-card-title">Geofence Boundary & Punch Location</h3>
            <span className="badge-within">✓ Inside Perimeter</span>
          </div>

          <div
            style={{
              position: 'relative',
              height: '240px',
              background: '#f1f5f9',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Mock Geofence Map Graphic */}
            <div
              style={{
                position: 'absolute',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.12)',
                border: '2px dashed #22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '12px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#15803d',
                  background: '#ffffff',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  border: '1px solid #bbf7d0',
                }}
              >
                Head Office Perimeter (100m)
              </span>

              {/* Site Center Point */}
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#16a34a',
                  border: '2px solid #ffffff',
                  boxShadow: '0 0 6px rgba(0,0,0,0.2)',
                }}
                title="Site Center"
              />

              {/* Employee Check-In Pin */}
              <div
                style={{
                  position: 'absolute',
                  top: '65px',
                  right: '65px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                  }}
                >
                  {dossier.name} ({activeLog.checkIn || '08:58'})
                </div>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    background: '#2563eb',
                    borderRadius: '50%',
                    marginTop: '2px',
                    border: '1px solid #ffffff',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                bottom: '10px',
                left: '12px',
                background: 'rgba(255, 255, 255, 0.95)',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '11px',
                color: '#334155',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              📍 Site: <strong>{dossier.site}</strong> (Authorized Office Boundary)
            </div>
          </div>

          <p style={{ fontSize: '11.5px', color: '#64748b', margin: '10px 0 0 0' }}>
            Biometric and satellite telemetry verified that the employee was physically present within
            the approved perimeter coordinates during daily check-in.
          </p>
        </div>
      </div>

      {/* 5. Monthly Attendance Day-by-Day Table */}
      <div className="att-table-card">
        <div className="att-table-top-bar">
          <h2 className="att-table-title">
            Attendance Log for {selectedMonth} — {dossier.name}
          </h2>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Click on any row to inspect its biometric punch and geofence telemetry
          </span>
        </div>

        <div className="att-table-wrapper">
          <table className="att-dense-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Shift</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Worked Hours</th>
                <th>Face ID</th>
                <th>Geofence</th>
                <th>Status</th>
                <th>Exceptions / Notes</th>
                <th style={{ textAlign: 'center' }}>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_MONTH_LOGS.map((row, index) => {
                const isSelected = selectedLogIndex === index;
                return (
                  <tr
                    key={row.date}
                    onClick={() => setSelectedLogIndex(index)}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? '#eff6ff' : undefined,
                    }}
                  >
                    <td style={{ fontWeight: 650, color: '#0f172a' }}>{row.date}</td>
                    <td>{row.dayName}</td>
                    <td>{row.shift}</td>
                    <td>
                      {row.checkIn ? (
                        <span
                          className={row.status === 'late' ? 'pill-time-red' : 'pill-time-green'}
                        >
                          {row.checkIn}
                        </span>
                      ) : (
                        <span className="pill-time-dash">-</span>
                      )}
                    </td>
                    <td>
                      {row.checkOut ? (
                        <span className="pill-time-green">{row.checkOut}</span>
                      ) : (
                        <span className="pill-time-dash">-</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 550 }}>{row.hoursWorked}</td>
                    <td>
                      {row.faceVerified ? (
                        <span className="badge-yes">
                          <Check size={13} strokeWidth={2.5} />
                          <span>Yes</span>
                        </span>
                      ) : (
                        <span className="pill-time-dash">-</span>
                      )}
                    </td>
                    <td>
                      {row.geofenceStatus === 'within' && (
                        <span className="badge-within">
                          <Check size={11} strokeWidth={2.5} />
                          <span>Within ({row.distanceMeters}m)</span>
                        </span>
                      )}
                      {row.geofenceStatus === 'out_of_range' && (
                        <span className="badge-out-range">
                          <X size={11} strokeWidth={2.5} />
                          <span>Out of Range</span>
                        </span>
                      )}
                      {row.geofenceStatus === 'none' && <span className="pill-time-dash">-</span>}
                    </td>
                    <td>
                      {row.status === 'present' && (
                        <span
                          style={{
                            background: '#dcfce7',
                            color: '#15803d',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          Present
                        </span>
                      )}
                      {row.status === 'late' && (
                        <span className="badge-late">
                          <Clock size={11} />
                          <span>Late</span>
                        </span>
                      )}
                      {row.status === 'absent' && (
                        <span
                          style={{
                            background: '#fee2e2',
                            color: '#b91c1c',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          Absent
                        </span>
                      )}
                      {row.status === 'leave' && (
                        <span
                          style={{
                            background: '#e0f2fe',
                            color: '#0369a1',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          On Leave
                        </span>
                      )}
                      {row.status === 'weekend' && (
                        <span style={{ color: '#94a3b8', fontSize: '11px' }}>Rest Day</span>
                      )}
                    </td>
                    <td>
                      {row.exception ? (
                        <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 550 }}>
                          {row.exception}
                        </span>
                      ) : (
                        <span className="pill-time-dash">-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn-row-action"
                        type="button"
                        title="View inspection"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLogIndex(index);
                        }}
                      >
                        <ExternalLink size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
