import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Search,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ApprovalItem {
  id: string;
  type: 'leave' | 'po' | 'expense' | 'project' | 'hiring';
  title: string;
  requester: string;
  department: string;
  date: string;
  amountOrDuration: string;
  details: string;
  priority: 'High' | 'Normal' | 'Low';
  status: 'pending' | 'approved' | 'rejected';
}

const INITIAL_APPROVALS: ApprovalItem[] = [
  // Leave Requests
  {
    id: 'APP-101',
    type: 'leave',
    title: 'Annual Leave Request (3 Days)',
    requester: 'Engr. Imran Saeed',
    department: 'Civil Engineering',
    date: 'Today, 09:15 AM',
    amountOrDuration: '3 Days (16-18 Oct)',
    details: 'Family event and outstation travel. Site duties delegated to Engr. Tariq Mehmood.',
    priority: 'Normal',
    status: 'pending',
  },
  {
    id: 'APP-102',
    type: 'leave',
    title: 'Medical Sick Leave (1 Day)',
    requester: 'Muhammad Rashid',
    department: 'Engineering Operations',
    date: 'Today, 09:40 AM',
    amountOrDuration: '1 Day (14 Oct)',
    details: 'Sudden fever and medical doctor consultation.',
    priority: 'High',
    status: 'pending',
  },
  {
    id: 'APP-103',
    type: 'leave',
    title: 'Annual Leave Request (5 Days)',
    requester: 'Engr. Tariq Mehmood',
    department: 'Site Operations',
    date: 'Yesterday, 04:30 PM',
    amountOrDuration: '5 Days (20-25 Oct)',
    details: 'Annual leaves balance clearance approved by project director.',
    priority: 'Normal',
    status: 'pending',
  },
  {
    id: 'APP-104',
    type: 'leave',
    title: 'Casual Leave (1 Day)',
    requester: 'Engr. Haris Khan',
    department: 'Electrical Projects',
    date: 'Yesterday, 02:10 PM',
    amountOrDuration: '1 Day (15 Oct)',
    details: 'Bank and personal domestic obligations.',
    priority: 'Low',
    status: 'pending',
  },
  {
    id: 'APP-105',
    type: 'leave',
    title: 'Emergency Leave (2 Days)',
    requester: 'Tariq Mehmood',
    department: 'Electrical Projects',
    date: 'Yesterday, 11:00 AM',
    amountOrDuration: '2 Days (14-15 Oct)',
    details: 'Family emergency at home district.',
    priority: 'High',
    status: 'pending',
  },

  // Purchase Orders
  {
    id: 'APP-201',
    type: 'po',
    title: 'PO #PO-7782: Dell Core i7 Field Workstations',
    requester: 'Kamran Shah',
    department: 'IT & Infrastructure',
    date: 'Today, 09:15 AM',
    amountOrDuration: 'PKR 850,000',
    details: '3x Dell Precision Laptops with CAD licenses for site engineering team.',
    priority: 'High',
    status: 'pending',
  },
  {
    id: 'APP-202',
    type: 'po',
    title: 'PO #PO-7783: Cement & Structural Steel Rebar',
    requester: 'Engr. Haris Khan',
    department: 'Procurement',
    date: 'Yesterday, 03:20 PM',
    amountOrDuration: 'PKR 3,450,000',
    details: 'Bulk foundation supplies for Site A - Phase 2 Expansion.',
    priority: 'High',
    status: 'pending',
  },
  {
    id: 'APP-203',
    type: 'po',
    title: 'PO #PO-7784: Industrial PPE & Safety Helmets',
    requester: 'Asim Qureshi',
    department: 'HSE & Safety',
    date: 'Yesterday, 12:45 PM',
    amountOrDuration: 'PKR 185,000',
    details: 'Safety harnesses, steel toe shoes, and high-visibility vests for 40 field workers.',
    priority: 'Normal',
    status: 'pending',
  },

  // Expense Claims
  {
    id: 'APP-301',
    type: 'expense',
    title: 'Outstation Site Travel & Fuel Claim',
    requester: 'Sajid Mehmood',
    department: 'Field Service',
    date: 'Today, 08:30 AM',
    amountOrDuration: 'PKR 46,200',
    details: 'Vehicle maintenance and fuel bills for Sukkur-Karachi inspection route.',
    priority: 'Normal',
    status: 'pending',
  },
  {
    id: 'APP-302',
    type: 'expense',
    title: 'Client Business Dinner & Protocol',
    requester: 'Zeeshan Akhtar',
    department: 'Sales & Business Dev',
    date: 'Yesterday, 06:10 PM',
    amountOrDuration: 'PKR 28,500',
    details: 'Dinner meeting with delegation from National Highway Authority.',
    priority: 'Normal',
    status: 'pending',
  },
  {
    id: 'APP-303',
    type: 'expense',
    title: 'Emergency Generator Spares Repair',
    requester: 'Nadeem Abbas',
    department: 'Operations',
    date: 'Yesterday, 01:25 PM',
    amountOrDuration: 'PKR 65,000',
    details: 'Emergency rewinding and oil filters for Cummins 100kVA at Site B.',
    priority: 'High',
    status: 'pending',
  },
  {
    id: 'APP-304',
    type: 'expense',
    title: 'Mobile Phone Allowance (Q3)',
    requester: 'Bilal Hassan',
    department: 'Operations',
    date: '13 Oct 2026',
    amountOrDuration: 'PKR 15,000',
    details: 'Approved quarterly communication allowance for site managers.',
    priority: 'Low',
    status: 'pending',
  },

  // Project Proposals
  {
    id: 'APP-401',
    type: 'project',
    title: 'Project Proposal: Solar Farm Grid Integration Phase 1',
    requester: 'Dr. Munir Ahmed',
    department: 'Energy Projects',
    date: 'Yesterday, 05:00 PM',
    amountOrDuration: 'Est. PKR 42,000,000',
    details: 'Technical feasibility and BOQ verified. Ready for executive sign-off.',
    priority: 'High',
    status: 'pending',
  },
  {
    id: 'APP-402',
    type: 'project',
    title: 'Project Proposal: ERP Cloud Warehouse Automation',
    requester: 'Adnan Siddiqui',
    department: 'Supply Chain',
    date: '12 Oct 2026',
    amountOrDuration: 'Est. PKR 8,500,000',
    details: 'Barcode and RFID scanning installation for main centralized warehouse.',
    priority: 'Normal',
    status: 'pending',
  },

  // Hiring Approvals
  {
    id: 'APP-501',
    type: 'hiring',
    title: 'Hiring Approval: Senior Structural Engineer',
    requester: 'HR Onboarding Team',
    department: 'Engineering',
    date: 'Today, 10:24 AM',
    amountOrDuration: 'Salary: PKR 240,000/mo',
    details: 'Candidate: Muhammad Zubair. 8 years exp. Background checks verified.',
    priority: 'High',
    status: 'pending',
  },
  {
    id: 'APP-502',
    type: 'hiring',
    title: 'Hiring Approval: HSE Site Officer',
    requester: 'HR Onboarding Team',
    department: 'HSE',
    date: 'Yesterday, 02:00 PM',
    amountOrDuration: 'Salary: PKR 110,000/mo',
    details: 'Candidate: Zainab Bibi. NEBOSH certified. Assigned to Site B.',
    priority: 'Normal',
    status: 'pending',
  },
  {
    id: 'APP-503',
    type: 'hiring',
    title: 'Hiring Approval: Electrical Technician',
    requester: 'HR Onboarding Team',
    department: 'Maintenance',
    date: '13 Oct 2026',
    amountOrDuration: 'Salary: PKR 65,000/mo',
    details: 'Candidate: Rashid Ali. DAE Electrical with 5 years industrial experience.',
    priority: 'Normal',
    status: 'pending',
  },
];

export function AdminApprovalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeType = searchParams.get('type') || 'all';
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<ApprovalItem[]>(INITIAL_APPROVALS);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const handleApprove = (id: string, title: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'approved' } : item)),
    );
    setActionMessage(`Approved successfully: "${title}"`);
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleReject = (id: string, title: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'rejected' } : item)),
    );
    setActionMessage(`Rejected request: "${title}"`);
    setTimeout(() => setActionMessage(null), 4000);
  };

  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const approvedCount = items.filter((i) => i.status === 'approved').length;
  const rejectedCount = items.filter((i) => i.status === 'rejected').length;

  const filteredItems = items.filter((item) => {
    const matchesType = activeType === 'all' || item.type === activeType;
    const matchesSearch =
      search === '' ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.requester.toLowerCase().includes(search.toLowerCase()) ||
      item.department.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getBadgeStyle = (type: ApprovalItem['type']) => {
    switch (type) {
      case 'leave':
        return { bg: '#fdf2f8', color: '#db2777', label: 'Leave Request' };
      case 'po':
        return { bg: '#fffbeb', color: '#d97706', label: 'Purchase Order' };
      case 'expense':
        return { bg: '#eff6ff', color: '#2563eb', label: 'Expense Claim' };
      case 'project':
        return { bg: '#f0fdf4', color: '#16a34a', label: 'Project Proposal' };
      case 'hiring':
        return { bg: '#faf5ff', color: '#9333ea', label: 'Hiring Approval' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            to="/admin/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#475569',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 750, color: '#0f172a', margin: 0 }}>
              Approvals Center
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0' }}>
              Review, verify, and approve cross-functional ERP requests and authorizations.
            </p>
          </div>
        </div>

        {/* Counter Pills */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '6px 14px', borderRadius: '8px', fontSize: '12.5px', color: '#b45309', fontWeight: 600 }}>
            Pending: {pendingCount}
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', padding: '6px 14px', borderRadius: '8px', fontSize: '12.5px', color: '#15803d', fontWeight: 600 }}>
            Approved: {approvedCount}
          </div>
          <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: '6px 14px', borderRadius: '8px', fontSize: '12.5px', color: '#b91c1c', fontWeight: 600 }}>
            Rejected: {rejectedCount}
          </div>
        </div>
      </div>

      {actionMessage && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '12px 18px', borderRadius: '8px', color: '#065f46', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} style={{ color: '#10b981' }} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#ffffff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: `All (${items.length})` },
            { key: 'leave', label: 'Leave Requests (5)' },
            { key: 'po', label: 'Purchase Orders (3)' },
            { key: 'expense', label: 'Expense Claims (4)' },
            { key: 'project', label: 'Project Proposals (2)' },
            { key: 'hiring', label: 'Hiring Approvals (3)' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setSearchParams(tab.key === 'all' ? {} : { type: tab.key });
              }}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeType === tab.key ? '#2563eb' : '#f1f5f9',
                color: activeType === tab.key ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', minWidth: '240px' }}>
          <Search size={15} style={{ color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search approvals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '100%', color: '#0f172a' }}
          />
        </div>
      </div>

      {/* Approvals Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredItems.map((item) => {
          const badge = getBadgeStyle(item.type);
          return (
            <div
              key={item.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                opacity: item.status !== 'pending' ? 0.75 : 1,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      background: badge.bg,
                      color: badge.color,
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                    }}
                  >
                    {badge.label}
                  </span>
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
                    {item.id}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: item.priority === 'High' ? '#dc2626' : '#64748b',
                      background: item.priority === 'High' ? '#fee2e2' : '#f1f5f9',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                  >
                    {item.priority} Priority
                  </span>
                </div>

                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '2px 0 0' }}>
                  {item.title}
                </h3>

                <p style={{ fontSize: '12.5px', color: '#475569', margin: 0, lineHeight: 1.4 }}>
                  {item.details}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                  <span>
                    <strong>Requester:</strong> {item.requester} ({item.department})
                  </span>
                  <span>
                    <strong>Value:</strong>{' '}
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>{item.amountOrDuration}</span>
                  </span>
                  <span>
                    <strong>Submitted:</strong> {item.date}
                  </span>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                {item.status === 'pending' ? (
                  <>
                    <Button
                      onClick={() => handleApprove(item.id, item.title)}
                      style={{
                        background: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>Approve</span>
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => handleReject(item.id, item.title)}
                      style={{
                        background: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fee2e2',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <XCircle size={16} />
                      <span>Reject</span>
                    </Button>
                  </>
                ) : item.status === 'approved' ? (
                  <span
                    style={{
                      background: '#dcfce7',
                      color: '#15803d',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Approved</span>
                  </span>
                ) : (
                  <span
                    style={{
                      background: '#fee2e2',
                      color: '#b91c1c',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <XCircle size={16} />
                    <span>Rejected</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <ClipboardCheck size={36} style={{ color: '#94a3b8', margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '15px', color: '#0f172a', margin: '0 0 4px' }}>No approvals found</h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0 }}>
              There are no pending approval requests matching your search criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
