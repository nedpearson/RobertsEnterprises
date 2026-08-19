import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useLocation } from '../shared';
import { api, setActiveBoutique } from '../api/apiClient';

// ─── Navigation Items ───

interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles?: ('owner' | 'manager' | 'consultant')[];
  tiers?: ('essential' | 'growth' | 'enterprise')[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Today', path: '/', icon: '📊' },
  { label: 'Appointments', path: '/calendar', icon: '📅' },
  { label: 'Customers', path: '/customers', icon: '👰' },
  { label: 'Sales', path: '/financials', icon: '💰' },
  { label: 'Inventory', path: '/inventory', icon: '👗' },
  { label: 'Team', path: '/staff', icon: '👥', roles: ['owner', 'manager'] },
  { label: 'Growth', path: '/growth', icon: '📈', roles: ['owner'], tiers: ['growth', 'enterprise'] },
  { label: 'Reports', path: '/reports', icon: '📊' },
  { label: 'Settings', path: '/settings', icon: '⚙️', roles: ['owner'] },
];

// ─── AppShell ───

export default function AppShell() {
  const { user, logout, isAuthenticated } = useAuth();
  const { locations, activeLocation, setActiveLocation, setLocations } = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleDemoReset = async () => {
    if (!window.confirm('Are you sure you want to reset all demo data? This will wipe and reseed the demo database.')) return;
    try {
      await api.post('/api/demo-reset');
      window.location.reload();
    } catch (err: any) {
      alert('Failed to reset demo: ' + err.message);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Fetch boutiques
    api.get<{ boutiques: any[] }>('/api/boutiques')
      .then(res => {
        const boutiquesList = res.boutiques || [];
        setLocations(boutiquesList);

        // Restore active boutique selection if stored in localStorage
        const storedIdStr = localStorage.getItem('vowos_active_boutique_id');
        const storedId = storedIdStr ? parseInt(storedIdStr, 10) : null;

        const matched = boutiquesList.find(b => b.id === storedId) ||
                        boutiquesList.find(b => b.id === user.boutique_id) ||
                        boutiquesList[0] || null;

        setActiveLocation(matched);
        setActiveBoutique(matched?.id || null);
        
        if (matched) {
          document.documentElement.setAttribute('data-brand', matched.brand);
        }
      })
      .catch(err => {
        console.error('Failed to load boutiques directory:', err);
      });
  }, [isAuthenticated, user, setLocations, setActiveLocation]);

  if (!isAuthenticated || !user) return null;

  const visibleNav = NAV_ITEMS.filter(item => {
    if (item.roles && !item.roles.includes(user.role)) return false;
    if (item.tiers && user.subscription_tier && !item.tiers.includes(user.subscription_tier)) return false;
    return true;
  });

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleBoutiqueChange = (boutiqueId: number) => {
    const matched = locations.find(b => b.id === boutiqueId) || null;
    setActiveLocation(matched);
    setActiveBoutique(matched?.id || null);
    if (matched) {
      localStorage.setItem('vowos_active_boutique_id', String(matched.id));
      document.documentElement.setAttribute('data-brand', matched.brand);
    } else {
      localStorage.removeItem('vowos_active_boutique_id');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 40,
            display: 'block',
          }}
          className="sidebar-overlay"
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: 260,
          minWidth: 260,
          background: 'var(--sidebar)',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          position: sidebarOpen ? 'fixed' : 'relative',
          height: '100vh',
          zIndex: 50,
          transform: sidebarOpen ? 'translateX(0)' : undefined,
          transition: 'transform 0.3s ease',
          overflowY: 'auto',
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        }}
        className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}
      >
        {/* Brand */}
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: '-0.02em', fontFamily: 'var(--font-display)', color: '#F7F2E8' }}>
            Vow<span style={{ color: 'var(--accent)' }}>OS</span>
          </h1>
          <p style={{ fontSize: 10, opacity: 0.5, margin: '4px 0 0', fontWeight: 400, letterSpacing: '2px', textTransform: 'uppercase' }}>
            Roberts Enterprises
          </p>
        </div>

        {/* Demo Mode Banner */}
        {(user.is_demo || activeLocation?.is_demo) && (
          <div style={{
            margin: '8px 12px',
            padding: '8px 10px',
            background: 'rgba(201, 161, 90, 0.15)',
            border: '1px solid rgba(201, 161, 90, 0.3)',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--accent)',
            textAlign: 'center',
          }}>
            <div>🎭 DEMO MODE</div>
            <button
              onClick={handleDemoReset}
              style={{
                marginTop: 6,
                width: '100%',
                padding: '4px 8px',
                background: 'rgba(201, 161, 90, 0.25)',
                border: '1px solid rgba(201, 161, 90, 0.4)',
                borderRadius: 6,
                fontSize: 10,
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              🔄 Reset Demo Data
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 8px', overflowY: 'auto' }}>
          {visibleNav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              end={item.path === '/'}
              style={({ isActive }: { isActive: boolean }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                marginBottom: 4,
              })}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: 12,
          background: 'rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#fff'
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ opacity: 0.5, fontSize: 11, textTransform: 'capitalize' }}>{user.role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '8px 0', borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent', color: 'rgba(255,255,255,0.7)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        {/* Top Header Bar */}
        <header style={{
          padding: '16px 28px',
          background: '#fff',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              padding: '6px 10px', background: 'transparent',
              border: '1px solid #d1d5db', borderRadius: 6,
              fontSize: 18, cursor: 'pointer',
              display: 'none', // shown via media query in index.css if desired
            }}
            className="mobile-menu-btn"
          >
            ☰
          </button>

          <div style={{ fontWeight: 600, fontSize: 18, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            Operational Command Center
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Boutique Switcher (Owner view can switch, others are view-only) */}
            {user.role === 'owner' ? (
              <select
                value={activeLocation?.id || ''}
                onChange={e => handleBoutiqueChange(parseInt(e.target.value, 10))}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  fontSize: 13,
                  fontWeight: 500,
                  outline: 'none',
                  background: '#fff',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                }}
              >
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name || loc.city || 'Boutique Location'}
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-main)', background: 'var(--accent-light)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--accent)' }}>
                📍 {activeLocation?.name || user.boutique_name || 'Boutique'}
              </span>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div style={{ padding: '24px 28px', flex: 1 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

