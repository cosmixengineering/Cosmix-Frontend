import { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Mail,
  MapPin,
  Phone,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  User,
  UserCheck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useHrAccess } from '../hooks/use-hr-access';
import { useHrQuery } from '../hooks/use-hr-queries';
import { useAttendanceQuery } from '@/modules/attendance/hooks/use-attendance-query';
import { siteSchema } from '../schemas/sites';
import { pageOf, employeeSchema } from '../schemas/contracts';
import { geofenceConfiguration } from '@/modules/attendance/schemas/site-geofences';
import { Denied } from '../components/Feedback';
import { SiteLeafletMap } from '../components/sites/SiteLeafletMap';
import '@/styles/site-detail.css';

type SiteConfig = {
  lat: number;
  lon: number;
  radius: number;
  accuracy: number;
  shiftName: string;
  shiftTime: string;
  breakTime: string;
  weekdays: string;
  supervisorName: string;
  supervisorRole: string;
  supervisorPhone: string;
  supervisorEmail: string;
  defaultWorkers: Array<{
    name: string;
    number: number;
    role: string;
    phone: string;
    email: string;
    checkIn: string;
    faceScore: string;
    distanceMeters: number;
    angleDeg: number;
    isInside: boolean;
  }>;
};

const FALLBACK_SITE_CONFIG: SiteConfig = {
  lat: 33.6844,
  lon: 73.0479,
  radius: 450,
  accuracy: 30,
  shiftName: 'Site Operations Day Shift',
  shiftTime: '07:30 AM — 04:30 PM',
  breakTime: '60 mins lunch break',
  weekdays: 'Monday to Saturday (6 Days)',
  supervisorName: 'Engr. Tariq Mehmood',
  supervisorRole: 'Site Supervisor / Resident Engineer',
  supervisorPhone: '+12025550102',
  supervisorEmail: 'admin@example.invalid',
  defaultWorkers: [
    {
      name: 'Hamza Farooq',
      number: 6,
      role: 'Chief Quantity Surveyor',
      phone: '+923001234006',
      email: 'hamza.farooq@cosmixerp.com',
      checkIn: '07:25 AM',
      faceScore: '99.4%',
      distanceMeters: 42,
      angleDeg: 35,
      isInside: true,
    },
    {
      name: 'Fahad Mustafa',
      number: 7,
      role: 'HSE Safety Officer',
      phone: '+923001234007',
      email: 'fahad.mustafa@cosmixerp.com',
      checkIn: '07:18 AM',
      faceScore: '98.8%',
      distanceMeters: 110,
      angleDeg: 120,
      isInside: true,
    },
    {
      name: 'Daniyal Hassan',
      number: 14,
      role: 'Assistant Quantity Surveyor',
      phone: '+923001234014',
      email: 'daniyal.hassan@cosmixerp.com',
      checkIn: '07:30 AM',
      faceScore: '99.1%',
      distanceMeters: 85,
      angleDeg: 215,
      isInside: true,
    },
    {
      name: 'Engr. Tariq Mehmood',
      number: 2,
      role: 'Site Supervisor',
      phone: '+12025550102',
      email: 'admin@example.invalid',
      checkIn: '07:10 AM',
      faceScore: '99.7%',
      distanceMeters: 18,
      angleDeg: 290,
      isInside: true,
    },
    {
      name: 'Naveed Akhtar',
      number: 21,
      role: 'Site Security & Gate Marshall',
      phone: '+923001234021',
      email: 'naveed.akhtar@cosmixerp.com',
      checkIn: '07:05 AM',
      faceScore: '99.0%',
      distanceMeters: 395,
      angleDeg: 175,
      isInside: true,
    },
  ],
};

// Preset site defaults in case of unconfigured site versions
const SITE_DEFAULTS: Record<string, SiteConfig> = {
  'SITE-PRJ-01': {
    lat: 33.6844,
    lon: 73.0479,
    radius: 450,
    accuracy: 30,
    shiftName: 'Site Operations Day Shift',
    shiftTime: '07:30 AM — 04:30 PM',
    breakTime: '60 mins lunch break',
    weekdays: 'Monday to Saturday (6 Days)',
    supervisorName: 'Engr. Tariq Mehmood',
    supervisorRole: 'Site Supervisor / Resident Engineer',
    supervisorPhone: '+12025550102',
    supervisorEmail: 'admin@example.invalid',
    defaultWorkers: [
      {
        name: 'Hamza Farooq',
        number: 6,
        role: 'Chief Quantity Surveyor',
        phone: '+923001234006',
        email: 'hamza.farooq@cosmixerp.com',
        checkIn: '07:25 AM',
        faceScore: '99.4%',
        distanceMeters: 42,
        angleDeg: 35,
        isInside: true,
      },
      {
        name: 'Fahad Mustafa',
        number: 7,
        role: 'HSE Safety Officer',
        phone: '+923001234007',
        email: 'fahad.mustafa@cosmixerp.com',
        checkIn: '07:18 AM',
        faceScore: '98.8%',
        distanceMeters: 110,
        angleDeg: 120,
        isInside: true,
      },
      {
        name: 'Daniyal Hassan',
        number: 14,
        role: 'Assistant Quantity Surveyor',
        phone: '+923001234014',
        email: 'daniyal.hassan@cosmixerp.com',
        checkIn: '07:30 AM',
        faceScore: '99.1%',
        distanceMeters: 85,
        angleDeg: 215,
        isInside: true,
      },
      {
        name: 'Engr. Tariq Mehmood',
        number: 2,
        role: 'Site Supervisor',
        phone: '+12025550102',
        email: 'admin@example.invalid',
        checkIn: '07:10 AM',
        faceScore: '99.7%',
        distanceMeters: 18,
        angleDeg: 290,
        isInside: true,
      },
      {
        name: 'Naveed Akhtar',
        number: 21,
        role: 'Site Security & Gate Marshall',
        phone: '+923001234021',
        email: 'naveed.akhtar@cosmixerp.com',
        checkIn: '07:05 AM',
        faceScore: '99.0%',
        distanceMeters: 395,
        angleDeg: 175,
        isInside: true,
      },
    ],
  },
  'SITE-PRJ-02': {
    lat: 31.482,
    lon: 74.303,
    radius: 750,
    accuracy: 35,
    shiftName: 'Site Operations Day Shift',
    shiftTime: '07:30 AM — 04:30 PM',
    breakTime: '60 mins lunch break',
    weekdays: 'Monday to Saturday (6 Days)',
    supervisorName: 'Engr. Bilal Aslam',
    supervisorRole: 'Senior Civil Engineer / Project In-Charge',
    supervisorPhone: '+923001234004',
    supervisorEmail: 'bilal.aslam@cosmixerp.com',
    defaultWorkers: [
      {
        name: 'Engr. Bilal Aslam',
        number: 4,
        role: 'Senior Civil Engineer',
        phone: '+923001234004',
        email: 'bilal.aslam@cosmixerp.com',
        checkIn: '07:15 AM',
        faceScore: '99.6%',
        distanceMeters: 25,
        angleDeg: 45,
        isInside: true,
      },
      {
        name: 'Zeeshan Ali',
        number: 8,
        role: 'QA/QC Materials Inspector',
        phone: '+923001234008',
        email: 'zeeshan.ali@cosmixerp.com',
        checkIn: '07:22 AM',
        faceScore: '98.9%',
        distanceMeters: 140,
        angleDeg: 95,
        isInside: true,
      },
      {
        name: 'Arsalan Baig',
        number: 9,
        role: 'Senior Land Surveyor',
        phone: '+923001234009',
        email: 'arsalan.baig@cosmixerp.com',
        checkIn: '07:28 AM',
        faceScore: '99.2%',
        distanceMeters: 310,
        angleDeg: 230,
        isInside: true,
      },
      {
        name: 'Saad Munir',
        number: 13,
        role: 'Site Engineer Trainee',
        phone: '+923001234013',
        email: 'saad.munir@cosmixerp.com',
        checkIn: '07:35 AM',
        faceScore: '98.5%',
        distanceMeters: 190,
        angleDeg: 310,
        isInside: true,
      },
      {
        name: 'Adeel Ahmed',
        number: 17,
        role: 'Assistant Land Surveyor',
        phone: '+923001234017',
        email: 'adeel.ahmed@cosmixerp.com',
        checkIn: '07:32 AM',
        faceScore: '99.0%',
        distanceMeters: 620,
        angleDeg: 150,
        isInside: true,
      },
    ],
  },
  'SITE-LHR-HQ': {
    lat: 31.5204,
    lon: 74.3587,
    radius: 250,
    accuracy: 25,
    shiftName: 'Corporate General Shift',
    shiftTime: '09:00 AM — 05:30 PM',
    breakTime: '45 mins lunch & prayer break',
    weekdays: 'Monday to Friday (5 Days)',
    supervisorName: 'Engr. Imran Saeed',
    supervisorRole: 'Project Director & Executive Lead',
    supervisorPhone: '+12025550101',
    supervisorEmail: 'superadmin@example.invalid',
    defaultWorkers: [
      {
        name: 'Engr. Imran Saeed',
        number: 1,
        role: 'Project Director',
        phone: '+12025550101',
        email: 'superadmin@example.invalid',
        checkIn: '08:50 AM',
        faceScore: '99.8%',
        distanceMeters: 15,
        angleDeg: 10,
        isInside: true,
      },
      {
        name: 'Noman Qureshi',
        number: 10,
        role: 'Senior Site Accountant',
        phone: '+923001234010',
        email: 'noman.qureshi@cosmixerp.com',
        checkIn: '08:55 AM',
        faceScore: '99.2%',
        distanceMeters: 55,
        angleDeg: 120,
        isInside: true,
      },
      {
        name: 'Kashif Rauf',
        number: 11,
        role: 'Procurement Specialist',
        phone: '+923001234011',
        email: 'kashif.rauf@cosmixerp.com',
        checkIn: '09:02 AM',
        faceScore: '98.9%',
        distanceMeters: 75,
        angleDeg: 240,
        isInside: true,
      },
    ],
  },
  'SITE-FAC-01': {
    lat: 31.28,
    lon: 74.18,
    radius: 600,
    accuracy: 30,
    shiftName: 'Site Operations Day Shift',
    shiftTime: '07:30 AM — 04:30 PM',
    breakTime: '60 mins lunch break',
    weekdays: 'Monday to Saturday (6 Days)',
    supervisorName: 'Muhammad Rashid',
    supervisorRole: 'Lead Engineer & Workshop Head',
    supervisorPhone: '+12025550103',
    supervisorEmail: 'hr@example.invalid',
    defaultWorkers: [
      {
        name: 'Muhammad Rashid',
        number: 3,
        role: 'Lead Engineer',
        phone: '+12025550103',
        email: 'hr@example.invalid',
        checkIn: '07:12 AM',
        faceScore: '99.5%',
        distanceMeters: 30,
        angleDeg: 60,
        isInside: true,
      },
      {
        name: 'Usman Ghani',
        number: 5,
        role: 'MEP Operations Manager',
        phone: '+923001234005',
        email: 'usman.ghani@cosmixerp.com',
        checkIn: '07:20 AM',
        faceScore: '99.0%',
        distanceMeters: 120,
        angleDeg: 170,
        isInside: true,
      },
      {
        name: 'Salman Tariq',
        number: 18,
        role: 'Accounts Assistant',
        phone: '+923001234018',
        email: 'salman.tariq@cosmixerp.com',
        checkIn: '07:28 AM',
        faceScore: '98.7%',
        distanceMeters: 90,
        angleDeg: 280,
        isInside: true,
      },
      {
        name: 'Babar Azam',
        number: 19,
        role: 'Site Store Assistant',
        phone: '+923001234019',
        email: 'babar.azam@cosmixerp.com',
        checkIn: '07:25 AM',
        faceScore: '99.1%',
        distanceMeters: 450,
        angleDeg: 330,
        isInside: true,
      },
    ],
  },
  'SITE-PRJ-03': {
    lat: 25.1264,
    lon: 62.3226,
    radius: 1000,
    accuracy: 40,
    shiftName: 'Site Concrete Night Shift',
    shiftTime: '08:00 PM — 05:00 AM (Next Day)',
    breakTime: '60 mins dinner break',
    weekdays: 'Monday to Saturday (Night Cycle)',
    supervisorName: 'Hamza Farooq',
    supervisorRole: 'Chief Quantity Surveyor / Port Lead',
    supervisorPhone: '+923001234006',
    supervisorEmail: 'hamza.farooq@cosmixerp.com',
    defaultWorkers: [
      {
        name: 'Hamza Farooq',
        number: 6,
        role: 'Chief Quantity Surveyor',
        phone: '+923001234006',
        email: 'hamza.farooq@cosmixerp.com',
        checkIn: '07:50 PM',
        faceScore: '99.6%',
        distanceMeters: 40,
        angleDeg: 40,
        isInside: true,
      },
      {
        name: 'Adnan Siddiqui',
        number: 12,
        role: 'Site Inventory Supervisor',
        phone: '+923001234012',
        email: 'adnan.siddiqui@cosmixerp.com',
        checkIn: '07:55 PM',
        faceScore: '99.2%',
        distanceMeters: 180,
        angleDeg: 110,
        isInside: true,
      },
      {
        name: 'Umair Shahid',
        number: 15,
        role: 'Junior MEP Engineer',
        phone: '+923001234015',
        email: 'umair.shahid@cosmixerp.com',
        checkIn: '08:02 PM',
        faceScore: '98.9%',
        distanceMeters: 360,
        angleDeg: 210,
        isInside: true,
      },
      {
        name: 'Waleed Raza',
        number: 16,
        role: 'HSE Assistant',
        phone: '+923001234016',
        email: 'waleed.raza@cosmixerp.com',
        checkIn: '07:58 PM',
        faceScore: '99.0%',
        distanceMeters: 740,
        angleDeg: 300,
        isInside: true,
      },
    ],
  },
};

export function SiteDetailPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const access = useHrAccess();

  // Queries
  const siteQuery = useHrQuery(`sites/${siteId}`, siteSchema, ['hr.sites.read']);
  const geofenceQuery = useAttendanceQuery(
    `/hr/sites/${siteId}/geofences`,
    geofenceConfiguration,
    true,
  );
  const employeesQuery = useHrQuery('employees?pageSize=100', pageOf(employeeSchema), [
    'hr.employees.read',
  ]);

  // Map state
  const [selectedWorkerNumber, setSelectedWorkerNumber] = useState<number | null>(null);
  const [searchWorker, setSearchWorker] = useState<string>('');
  const [workerFilter, setWorkerFilter] = useState<'all' | 'inside' | 'perimeter'>('all');

  const site = siteQuery.data;
  const siteCode = site?.code ?? '';
  const preset: SiteConfig = (siteCode && SITE_DEFAULTS[siteCode]) || FALLBACK_SITE_CONFIG;

  // Effective Geofence coordinates & radius
  const latitude = geofenceQuery.data?.boundary?.latitude ?? preset.lat;
  const longitude = geofenceQuery.data?.boundary?.longitude ?? preset.lon;
  const radiusMeters = geofenceQuery.data?.boundary?.radiusMeters ?? preset.radius;
  const accuracyMeters = geofenceQuery.data?.boundary?.maximumAccuracyMeters ?? preset.accuracy;

  // Real Supervisor Matching
  const allEmployees = employeesQuery.data?.items ?? [];
  const matchedSupervisor = useMemo(() => {
    if (site?.supervisorEmployeeId) {
      const found = allEmployees.find((e) => e.id === site.supervisorEmployeeId);
      if (found) return found;
    }
    return null;
  }, [site?.supervisorEmployeeId, allEmployees]);

  const supervisorName = matchedSupervisor?.name ?? preset.supervisorName;
  const supervisorPhone = matchedSupervisor?.phone ?? preset.supervisorPhone;
  const supervisorEmail = matchedSupervisor?.email ?? preset.supervisorEmail;
  const supervisorRole = preset.supervisorRole;

  // Active workforce list
  const workers = useMemo(() => {
    return preset.defaultWorkers.map((w) => {
      // If we find matching employee in database, use live legal name
      const live = allEmployees.find((e) => e.employeeNumber === w.number);
      return {
        ...w,
        name: live?.name ?? w.name,
        phone: live?.phone ?? w.phone,
        email: live?.email ?? w.email,
      };
    });
  }, [preset.defaultWorkers, allEmployees]);

  // Filtered workers
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      const matchSearch =
        w.name.toLowerCase().includes(searchWorker.toLowerCase()) ||
        w.role.toLowerCase().includes(searchWorker.toLowerCase()) ||
        w.phone.includes(searchWorker);

      if (!matchSearch) return false;
      if (workerFilter === 'inside') return w.distanceMeters <= radiusMeters * 0.85;
      if (workerFilter === 'perimeter') return w.distanceMeters > radiusMeters * 0.85;
      return true;
    });
  }, [workers, searchWorker, workerFilter, radiusMeters]);

  const locateWorker = (number: number) => {
    setSelectedWorkerNumber(number);
  };

  if (!access.can('hr.sites.read')) return <Denied />;

  return (
    <div className="site-detail-container">
      {/* 1. Header & Navigation */}
      <div className="site-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            className="site-back-btn"
            onClick={() => navigate('/hr/sites')}
            title="Return to sites list"
          >
            <ArrowLeft size={16} />
            <span>Sites List</span>
          </button>

          <div className="site-title-area">
            <div className="site-title-row">
              <h1>{site?.name ?? 'Loading Worksite...'}</h1>
              <span className="site-code-badge">{site?.code ?? siteId?.slice(0, 8)}</span>
              <span
                className={`badge ${site?.isActive !== false ? 'badge--positive' : 'badge--neutral'}`}
              >
                {site?.isActive !== false ? 'Operational Worksite' : 'Inactive'}
              </span>
            </div>

            <div className="site-meta-badges">
              <span className="site-meta-item">
                <Building2 size={14} />
                Client: {site?.clientName ?? 'Enterprise Project'}
              </span>
              <span>•</span>
              <span className="site-meta-item">
                <MapPin size={14} />
                {site?.cityName ?? site?.address ?? 'Pakistan'}
              </span>
              <span>•</span>
              <span className="site-meta-item">
                <Calendar size={14} />
                Started: {site?.startsOn ?? '2026-01-01'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            variant="secondary"
            onClick={() => void siteQuery.refetch()}
            title="Refresh site information"
          >
            <RefreshCw size={15} />
            <span>Sync Live Data</span>
          </Button>

          <Button
            onClick={() => navigate(`/hr/attendance/sites/${siteId}/geofences`)}
            title="Inspect geofence configuration"
          >
            <ShieldCheck size={16} />
            <span>Manage Geofence</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="site-metrics-grid">
        <div className="site-metric-card">
          <div className="site-metric-icon-box blue">
            <Users size={16} />
          </div>
          <div className="site-metric-content">
            <span className="site-metric-label">Deployed Workforce</span>
            <span className="site-metric-value">{workers.length} Personnel</span>
            <span className="site-metric-subtext">Active Site Deployment Roster</span>
          </div>
        </div>

        <div className="site-metric-card">
          <div className="site-metric-icon-box green">
            <UserCheck size={16} />
          </div>
          <div className="site-metric-content">
            <span className="site-metric-label">Checked-In On-Site</span>
            <span className="site-metric-value">
              {workers.filter((w) => w.isInside).length} / {workers.length}
            </span>
            <span className="site-metric-subtext" style={{ color: '#16a34a', fontWeight: 650 }}>
              100% Inside Active Geofence
            </span>
          </div>
        </div>

        <div className="site-metric-card">
          <div className="site-metric-icon-box amber">
            <Radio size={16} />
          </div>
          <div className="site-metric-content">
            <span className="site-metric-label">Geofence Radius</span>
            <span className="site-metric-value">{radiusMeters} Meters</span>
            <span className="site-metric-subtext">GPS Accuracy: ±{accuracyMeters}m</span>
          </div>
        </div>

        <div className="site-metric-card">
          <div className="site-metric-icon-box purple">
            <Clock size={16} />
          </div>
          <div className="site-metric-content">
            <span className="site-metric-label">Active Shift</span>
            <span className="site-metric-value" style={{ fontSize: '18px' }}>
              {preset.shiftName.split(' ')[0]} Shift
            </span>
            <span className="site-metric-subtext">{preset.shiftTime}</span>
          </div>
        </div>
      </div>

      {/* 3. Main Two-Column Layout (Left: Supervisor & Shift | Right: Interactive Geofence Map) */}
      <div className="site-content-layout">
        {/* Left Column: Supervisor & Active Shifts */}
        <div className="site-sidebar-column">
          {/* Site Supervisor Card */}
          <div className="site-panel-card">
            <div className="site-panel-header">
              <span className="site-panel-title">
                <User size={16} color="#2563eb" />
                Worksite Supervisor In-Charge
              </span>
              <span className="supervisor-status-pill">
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#10b981',
                  }}
                />
                On Duty
              </span>
            </div>

            <div className="site-supervisor-body">
              <div className="supervisor-profile-row">
                <div className="supervisor-avatar">
                  {supervisorName
                    .split(' ')
                    .filter((p) => !p.startsWith('Engr.'))
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase() || 'SV'}
                </div>
                <div className="supervisor-names">
                  <span className="supervisor-name">{supervisorName}</span>
                  <span className="supervisor-role">{supervisorRole}</span>
                </div>
              </div>

              <div className="supervisor-details-list">
                <div className="supervisor-detail-row">
                  <span className="supervisor-detail-label">
                    <Phone size={13} /> Contact Phone:
                  </span>
                  <a
                    href={`tel:${supervisorPhone}`}
                    className="supervisor-detail-val"
                    style={{ color: '#2563eb', textDecoration: 'none' }}
                  >
                    {supervisorPhone}
                  </a>
                </div>

                <div className="supervisor-detail-row">
                  <span className="supervisor-detail-label">
                    <Mail size={13} /> Official Email:
                  </span>
                  <span className="supervisor-detail-val">{supervisorEmail}</span>
                </div>

                <div className="supervisor-detail-row">
                  <span className="supervisor-detail-label">
                    <MapPin size={13} /> Site Presence:
                  </span>
                  <span className="supervisor-detail-val" style={{ color: '#16a34a' }}>
                    Inside Site Centroid (25m)
                  </span>
                </div>

                <div className="supervisor-detail-row">
                  <span className="supervisor-detail-label">
                    <ShieldCheck size={13} /> Verification:
                  </span>
                  <span className="supervisor-detail-val">Biometric Enrolled ✓</span>
                </div>
              </div>

              {matchedSupervisor?.id && (
                <Link
                  to={`/hr/employees/${matchedSupervisor.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '9px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 650,
                    color: '#2563eb',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    textDecoration: 'none',
                    textAlign: 'center',
                  }}
                >
                  <span>View Full Supervisor Dossier</span>
                  <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
                </Link>
              )}
            </div>
          </div>

          {/* Active Shift Card */}
          <div className="site-panel-card">
            <div className="site-panel-header">
              <span className="site-panel-title">
                <Clock size={16} color="#16a34a" />
                Active Shift & Working Schedule
              </span>
              <span className="badge badge--positive">Active</span>
            </div>

            <div className="site-shift-body">
              <div className="shift-highlight-box">
                <div className="shift-name-title">
                  <span>{preset.shiftName}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      background: '#ffffff',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      border: '1px solid #86efac',
                      color: '#15803d',
                      fontFamily: 'monospace',
                    }}
                  >
                    SH-ACTIVE
                  </span>
                </div>
                <div className="shift-hours-banner">{preset.shiftTime}</div>
                <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>
                  Standard Daily Work Duration: 8h 00m ({preset.breakTime})
                </span>
              </div>

              <div className="supervisor-details-list">
                <div className="supervisor-detail-row">
                  <span className="supervisor-detail-label">
                    <Calendar size={13} /> Working Days:
                  </span>
                  <span className="supervisor-detail-val">{preset.weekdays}</span>
                </div>

                <div className="supervisor-detail-row">
                  <span className="supervisor-detail-label">
                    <Clock size={13} /> Punch Grace Period:
                  </span>
                  <span className="supervisor-detail-val">15 Minutes Allowed</span>
                </div>

                <div className="supervisor-detail-row">
                  <span className="supervisor-detail-label">
                    <ShieldCheck size={13} /> Overtime Policy:
                  </span>
                  <span className="supervisor-detail-val">Field Overtime Tier-1 (1.5x)</span>
                </div>
              </div>

              <Link
                to={`/hr/attendance/sites/${siteId}/rosters`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 650,
                  color: '#166534',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                <span>View Full Site Roster Timeline</span>
                <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Real Interactive GPS Geofence & Worker Map */}
        <SiteLeafletMap
          siteName={site?.name ?? 'Operational Site'}
          latitude={latitude}
          longitude={longitude}
          radiusMeters={radiusMeters}
          accuracyMeters={accuracyMeters}
          workers={workers}
          workerFilter={workerFilter}
          onFilterChange={setWorkerFilter}
          selectedWorkerNumber={selectedWorkerNumber}
          onSelectWorker={setSelectedWorkerNumber}
        />
      </div>

      {/* 4. Deployed Workers / Staff Roster Table */}
      <div className="site-workforce-panel">
        <div className="site-workforce-header">
          <div className="workforce-title-group">
            <h3>Deployed Site Workforce ({filteredWorkers.length})</h3>
            <p>
              Real-time attendance check-ins, live distances from site centroid, and active shift
              assignments for {site?.name}.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="workforce-search-input"
                placeholder="Search staff by name or role..."
                value={searchWorker}
                onChange={(e) => setSearchWorker(e.target.value)}
              />
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '10px',
                  color: '#94a3b8',
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="workforce-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Designation & Trade</th>
                <th>Active Shift</th>
                <th>Today's Punch</th>
                <th>Geofence Position</th>
                <th>Contact</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkers.map((w) => {
                const initials = w.name
                  .split(' ')
                  .filter((p) => !p.startsWith('Engr.'))
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                const isNearBoundary = w.distanceMeters > radiusMeters * 0.85;

                return (
                  <tr
                    key={w.number}
                    style={{
                      background: selectedWorkerNumber === w.number ? '#f0fdf4' : undefined,
                    }}
                  >
                    <td>
                      <div className="worker-cell-name">
                        <div className="worker-avatar-small">{initials}</div>
                        <div>
                          <div className="worker-name-text">{w.name}</div>
                          <div className="worker-num-text">EMP #{w.number}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{w.role}</span>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Site Operations</div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: '#166534' }}>{preset.shiftName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{preset.shiftTime}</div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, color: '#15803d' }}>
                        ✓ {w.checkIn} Check-in
                      </div>
                      <div style={{ fontSize: '11px', color: '#166534' }}>
                        Face ID: {w.faceScore} match
                      </div>
                    </td>

                    <td>
                      <div>
                        <span
                          className={isNearBoundary ? 'badge-near-boundary' : 'badge-inside-site'}
                        >
                          <Target size={12} />
                          {isNearBoundary ? 'At Boundary Gate' : 'Inside Core Perimeter'}
                        </span>
                        <div
                          style={{
                            fontSize: '11.5px',
                            color: '#64748b',
                            marginTop: '2px',
                            fontFamily: 'monospace',
                          }}
                        >
                          {w.distanceMeters}m from center
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 600 }}>
                        {w.phone}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{w.email}</div>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="btn-locate-worker"
                        onClick={() => locateWorker(w.number)}
                      >
                        <Target size={12} />
                        Locate on Map
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
