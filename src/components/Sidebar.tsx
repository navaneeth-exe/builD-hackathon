import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ParkingSquare, BookOpen, QrCode, Settings, Leaf, LogOut,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar() {
  const { profile, logout } = useAuth();
  const isStaff = profile?.role === 'staff';
  const isAdmin = profile?.role === 'admin';
  const isStudent = profile?.role === 'student' || !profile?.role;

  let NAV: Array<{ to: string; icon: any; label: string }> = [];

  if (isStudent) {
    NAV = [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/reserve',   icon: ParkingSquare,   label: 'Reserve Parking' },
      { to: '/bookings',  icon: BookOpen,         label: 'My Bookings' },
    ];
  } else if (isStaff) {
    NAV = [
      { to: '/gatekeeper',         icon: LayoutDashboard, label: 'Overview' },
      { to: '/gatekeeper/scan',    icon: QrCode,          label: 'Scan QR Pass' },
      { to: '/gatekeeper/parking', icon: ParkingSquare,   label: 'Live Parking' },
      { to: '/gatekeeper/vehicles',icon: BookOpen,        label: 'Active Vehicles' },
      { to: '/gatekeeper/bookings',icon: Settings,        label: 'Booking Lookup' },
    ];
  } else if (isAdmin) {
    NAV = [
      { to: '/admin',     icon: Settings,         label: 'Admin Settings' },
      { to: '/gatekeeper/scan', icon: QrCode,     label: 'Scan QR Pass' }, // Admin can also scan if needed
    ];
  }

  const visibleNav = NAV;

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : '?';

  return (
    <aside className="app-sidebar">
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#C7F36B',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Leaf size={18} color="#174C3C" />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.1 }}>ParkSync</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9.5, lineHeight: 1.2 }}>Campus Parking System</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {visibleNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User profile footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {profile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: '#C7F36B',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 12, color: '#174C3C', flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile.full_name || 'User'}
              </div>
              <div style={{
                color: '#C7F36B',
                fontSize: 10.5,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginTop: 1,
              }}>
                {profile.role === 'staff' ? 'Gate Operator' : profile.role}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', borderRadius: 7,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.65)', fontSize: 12.5,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
        >
          <LogOut size={13} />
          Sign Out
        </button>
        <div style={{ marginTop: 12, fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'center', lineHeight: 1.5 }}>
          Park Smarter · A Cleaner Campus
        </div>
      </div>
    </aside>
  );
}
