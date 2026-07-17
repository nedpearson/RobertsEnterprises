import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

// ─── nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    to: '/', label: 'Command Center',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  },
  {
    to: '/calendar', label: 'Calendar',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    to: '/locations', label: 'Locations',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  },
  {
    to: '/customers', label: 'Customers',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    to: '/communications', label: 'Communication Hub',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  },
  {
    to: '/chat', label: 'Team Chat',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  },
  {
    to: '/voice', label: 'Voice Assistant',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  },
  {
    to: '/inventory', label: 'Inventory',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  },
  {
    to: '/purchasing', label: 'Purchasing Portal',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,
  },
  {
    to: '/financials', label: 'Orders & Payments',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  },
  {
    to: '/reports', label: 'Reports',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  },
  {
    to: '/employees', label: 'Employee Hub',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
];

const OWNER_ITEMS = [
  {
    to: '/payroll', label: 'Payroll & Comm',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  },
  {
    to: '/settings', label: 'Settings',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  },
];

// ─── types ────────────────────────────────────────────────────────────────────

interface AppShellProps {
  currentUser: { id: number; name: string; role: string };
  activeBrand: 'ido' | 'proper';
  activeLocation: string;
  onBrandChange: (b: 'ido' | 'proper') => void;
  onLocationChange: (l: string) => void;
  onSignOut: () => void;
  onQuickAction: (action: string) => void;
}

// ─── shell ────────────────────────────────────────────────────────────────────

export function AppShell({
  currentUser,
  activeBrand,
  activeLocation,
  onBrandChange,
  onLocationChange,
  onSignOut,
  onQuickAction,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  const brandName = activeBrand === 'proper' ? 'Proper & Co.' : 'I Do Bridal Couture';
  const initials = currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="app-container" data-brand={activeBrand}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <nav className="sidebar" style={{ width: collapsed ? 64 : 250, transition: 'width 0.2s ease' }}>

        {/* Brand header */}
        <div className="brand" style={{ padding: collapsed ? '20px 0' : '28px 24px', justifyContent: collapsed ? 'center' : undefined }}>
          {!collapsed && (
            <>
              {brandName}
              <span>Roberts Enterprises</span>
            </>
          )}
          {collapsed && (
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>RE</div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer',
            color: '#9CA3AF', padding: '6px 0', width: '100%', fontSize: 12,
            display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-end',
            paddingRight: collapsed ? 0 : 16, gap: 4, transition: 'all 0.2s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {collapsed
              ? <path d="M9 18l6-6-6-6"/>
              : <path d="M15 18l-6-6 6-6"/>}
          </svg>
          {!collapsed && <span style={{ letterSpacing: 0.5 }}>collapse</span>}
        </button>

        {/* Nav links */}
        <div className="nav-links" style={{ overflowY: 'auto', flex: 1 }}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              title={collapsed ? item.label : undefined}
              style={{ justifyContent: collapsed ? 'center' : undefined, paddingLeft: collapsed ? 0 : undefined }}
            >
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && item.label}
            </NavLink>
          ))}

          {currentUser.role === 'owner' && (
            <>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '8px 16px' }} />
              {OWNER_ITEMS.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  title={collapsed ? item.label : undefined}
                  style={{ justifyContent: collapsed ? 'center' : undefined, paddingLeft: collapsed ? 0 : undefined }}
                >
                  <span style={{ flexShrink: 0 }}>{item.icon}</span>
                  {!collapsed && item.label}
                </NavLink>
              ))}
            </>
          )}
        </div>

        {/* Sign out */}
        <div style={{ padding: collapsed ? '12px 0' : '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={onSignOut}
            style={{
              width: '100%', background: 'transparent', border: 'none',
              color: '#6B7280', fontSize: 12, cursor: 'pointer', padding: '8px 0',
              display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 8, letterSpacing: 0.5,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {!collapsed && 'Sign Out'}
          </button>
        </div>
      </nav>

      {/* ── Main content ────────────────────────────────────── */}
      <main className="main-content">

        {/* Top bar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => onQuickAction('lead')}
              className="btn btn-primary"
              style={{ fontSize: 13, padding: '8px 16px' }}
            >
              + Add Lead
            </button>
            <button
              onClick={() => onQuickAction('po')}
              className="btn btn-outline"
              style={{ fontSize: 13, padding: '8px 16px' }}
            >
              + New PO
            </button>
            <button
              onClick={() => onQuickAction('appt')}
              className="btn btn-outline"
              style={{ fontSize: 13, padding: '8px 16px' }}
            >
              + Appointment
            </button>
          </div>

          <div className="topbar-actions">
            <div className="brand-switch">
              <select
                value={activeBrand}
                onChange={e => onBrandChange(e.target.value as 'ido' | 'proper')}
                aria-label="Active brand"
              >
                <option value="ido">I Do Bridal Couture</option>
                <option value="proper">Proper &amp; Co.</option>
              </select>
              <select
                value={activeLocation}
                onChange={e => onLocationChange(e.target.value)}
                aria-label="Active location"
              >
                <option value="Baton Rouge">Baton Rouge</option>
                <option value="Covington">Covington</option>
              </select>
            </div>

            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {currentUser.name}
              <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>({currentUser.role})</span>
            </span>

            <div
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'var(--accent)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 13, flexShrink: 0, cursor: 'default',
              }}
              title={currentUser.name}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Page outlet */}
        <Outlet />
      </main>
    </div>
  );
}
