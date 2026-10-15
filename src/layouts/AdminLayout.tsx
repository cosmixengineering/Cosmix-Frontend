import { useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  Users,
  BarChart3,
  Package,
  ShoppingCart,
  TrendingUp,
  Settings2,
  ListTodo,
  ClipboardCheck,
  FileText,
  UserCheck,
  Network,
  Settings,
  HelpCircle,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  Building2,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
  Calendar,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '@/auth/use-auth';
import { Button } from '@/components/ui/Button';
import '@/styles/admin-dashboard.css';

export function AdminLayout() {
  const { user, signOut, status } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('cosmix_sidebar_collapsed') === 'true';
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('cosmix_sidebar_collapsed', String(next));
      return next;
    });
  };

  const menuButton = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = Boolean(
    user?.grants.some(
      (g) =>
        g.permission === 'hr.organization.manage' ||
        g.permission === 'hr.employees.submissions.review' ||
        g.permission.startsWith('admin.'),
    ),
  );

  // If user is authenticated but not an admin, redirect to HR dashboard
  if (status === 'authenticated' && user && !isAdmin) {
    return <Navigate to="/hr/dashboard" replace />;
  }

  const displayName = user?.account?.displayName || 'Admin User';
  const roleName = 'System Administrator';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      void navigate(`/admin/approvals?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/panel', label: 'My Panel', icon: User },
    { to: '/hr/dashboard', label: 'HR', icon: Users },
    { to: '/hr/attendance', label: 'Attendance', icon: Clock },
    { to: '/hr/leaves', label: 'Leave Management', icon: Calendar },
    { to: '/hr/attendance/shifts', label: 'Shifts & Rosters', icon: CalendarDays },
    { to: '/admin/finance', label: 'Accounts & Finance', icon: BarChart3 },
    { to: '/admin/inventory', label: 'Inventory', icon: Package },
    { to: '/admin/procurement', label: 'Procurement', icon: ShoppingCart },
    { to: '/admin/sales', label: 'Sales & CRM', icon: TrendingUp },
    { to: '/admin/operations', label: 'Operations', icon: Settings2 },
    { to: '/admin/projects', label: 'Projects', icon: ListTodo },
    { to: '/admin/approvals', label: 'Approvals', icon: ClipboardCheck, badge: '17' },
    { to: '/admin/reports', label: 'Reports', icon: FileText },
    { to: '/admin/users', label: 'Users & Roles', icon: UserCheck },
    { to: '/admin/departments', label: 'Departments', icon: Network },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className={`admin-shell ${collapsed ? 'is-collapsed' : ''} ${isDark ? 'dark-mode' : ''}`}>
      {open && (
        <button
          className="hr-sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Admin Sidebar */}
      <aside
        className={`admin-sidebar ${isDark ? 'dark-mode' : ''} ${open ? 'is-open' : ''}`}
        aria-label="Admin Navigation"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', padding: '2px 4px 10px', gap: '6px' }}>
          <Link to="/admin/dashboard" className="admin-brand" style={{ borderBottom: 'none', padding: 0 }} onClick={() => setOpen(false)}>
            <div className="admin-brand-icon">
              <Building2 size={18} />
            </div>
            {!collapsed && (
              <div className="admin-brand-text">
                <h2>NextERP</h2>
                <p>One Platform. A Smarter Business.</p>
              </div>
            )}
          </Link>
          <button
            type="button"
            className="admin-sidebar-toggle-btn"
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand side menu' : 'Collapse side menu'}
            aria-label="Toggle side menu"
          >
            {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
        </div>

        <button
          className="icon-button hr-close-nav"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>

        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.label + item.to}
              to={item.to}
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
              end={item.to === '/admin/dashboard'}
              onClick={() => setOpen(false)}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={15} />
              {!collapsed && <span>{item.label}</span>}
              {item.badge && <span className="admin-badge-count">{item.badge}</span>}
            </NavLink>
          ))}

          <div className="admin-nav-divider" />

          <NavLink
            to="/admin/help"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setOpen(false)}
            title={collapsed ? 'Help & Support' : undefined}
          >
            <HelpCircle size={15} />
            {!collapsed && <span>Help & Support</span>}
          </NavLink>
        </nav>

        {/* Bottom Company Card */}
        {!collapsed && (
          <div className="admin-sidebar-bottom-card">
            <div className="admin-bottom-icon">
              <Building2 size={15} />
            </div>
            <div className="admin-bottom-text">
              <strong>Global ERP Solutions</strong>
              <span>Grow Together</span>
            </div>
          </div>
        )}
      </aside>

      {/* Main Workspace */}
      <div className="admin-workspace">
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '580px' }}>
            <button
              className="icon-button hr-open-nav"
              ref={menuButton}
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={18} />
            </button>

            {/* Desktop Open / Close Toggle Button */}
            <button
              type="button"
              className="admin-desktop-toggle-btn"
              onClick={toggleCollapsed}
              title={collapsed ? 'Open side menu' : 'Close side menu'}
              aria-label="Toggle side menu"
            >
              {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            </button>

            {/* Global Search Bar */}
            <form onSubmit={handleSearchSubmit} className="admin-search-bar">
              <Search size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search modules, employees, reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search ERP"
              />
            </form>
          </div>

          <div className="admin-topbar-actions">
            {/* Theme Toggle (Light / Dark) */}
            <button
              type="button"
              className="admin-theme-toggle"
              onClick={() => setIsDark(!isDark)}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun size={15} style={{ color: '#f59e0b' }} /> : <Moon size={15} />}
              <span>{isDark ? 'Light' : 'Dark'}</span>
            </button>

            {/* Notification Bell */}
            <Link
              to="/admin/approvals"
              className="admin-notification-bell"
              aria-label="5 unread notifications"
            >
              <Bell size={18} />
              <span className="hr-notification-counter">5</span>
            </Link>

            {/* User Chip */}
            <Link to="/admin/account" className="admin-user-chip">
              <div className="admin-user-avatar">
                {displayName.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="hr-user-info">
                <span className="hr-user-name">{displayName}</span>
                <span className="hr-user-role">{roleName}</span>
              </div>
            </Link>

            {/* Sign out */}
            <Button
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  await signOut();
                } catch {
                  setError('Sign out could not be confirmed.');
                } finally {
                  setBusy(false);
                }
              }}
            >
              <LogOut size={15} />
              <span>Sign out</span>
            </Button>
          </div>
        </header>

        {error && (
          <p role="alert" className="hr-message hr-message--error" style={{ margin: '16px 36px 0' }}>
            {error}
          </p>
        )}

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
