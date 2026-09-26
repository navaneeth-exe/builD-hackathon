import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ParkingSquare, BookOpen, QrCode,
  Settings, LogOut, Brain, Car, Search, Leaf,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* ── Nav item definition ── */
interface NavItem {
  to: string;
  icon: any;
  label: string;
  badge?: string;
}

/* ── Sidebar divider ── */
const NavSection = ({ label }: { label: string }) => (
  <div style={{
    padding: '14px 14px 6px',
    fontSize: 9.5,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.28)',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  }}>
    {label}
  </div>
);

/* ── Single nav link ── */
const NavItemLink = ({ item }: { item: NavItem }) => (
  <NavLink
    to={item.to}
    end={item.to === '/gatekeeper' || item.to === '/admin'}
    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
  >
    <item.icon size={16} strokeWidth={2} />
    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {item.label}
    </span>
    {item.badge && (
      <span style={{
        background: 'rgba(199,243,107,0.2)',
        color: '#C7F36B',
        fontSize: 9,
        fontWeight: 800,
        padding: '1px 6px',
        borderRadius: 99,
        border: '1px solid rgba(199,243,107,0.25)',
        letterSpacing: '0.02em',
        flexShrink: 0,
      }}>
        {item.badge}
      </span>
    )}
  </NavLink>
);

export default function Sidebar() {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const isStaff   = profile?.role === 'staff';
  const isAdmin   = profile?.role === 'admin';
  const isStudent = profile?.role === 'student' || !profile?.role;

  /* ── Role-based navigation ── */
  let sections: Array<{ heading?: string; items: NavItem[] }> = [];

  if (isStudent) {
    sections = [
      {
        heading: 'Parking',
        items: [
          { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
          { to: '/reserve',    icon: ParkingSquare,   label: 'Reserve Parking' },
          { to: '/bookings',   icon: BookOpen,        label: 'My Bookings' },
        ],
      },
    ];
  } else if (isStaff) {
    sections = [
      {
        heading: 'Operations',
        items: [
          { to: '/gatekeeper',          icon: LayoutDashboard, label: 'Overview' },
          { to: '/gatekeeper/scan',     icon: QrCode,          label: 'Scan QR Pass' },
          { to: '/gatekeeper/parking',  icon: ParkingSquare,   label: 'Live Parking' },
        ],
      },
      {
        heading: 'Management',
        items: [
          { to: '/gatekeeper/vehicles', icon: Car,     label: 'Active Vehicles' },
          { to: '/gatekeeper/bookings', icon: Search,  label: 'Booking Lookup' },
        ],
      },
    ];
  } else if (isAdmin) {
    sections = [
      {
        heading: 'Admin',
        items: [
          { to: '/admin',              icon: Settings,        label: 'Dashboard' },
          { to: '/admin/intelligence', icon: Brain,           label: 'AI Intelligence', badge: 'AI' },
        ],
      },
      {
        heading: 'Gate Operations',
        items: [
          { to: '/gatekeeper/scan',     icon: QrCode,         label: 'Scan QR Pass' },
          { to: '/gatekeeper/parking',  icon: ParkingSquare,  label: 'Live Parking' },
          { to: '/gatekeeper/vehicles', icon: Car,            label: 'Active Vehicles' },
          { to: '/gatekeeper/bookings', icon: Search,         label: 'Booking Lookup' },
        ],
      },
    ];
  }

  /* ── User avatar initials ── */
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : '?';

  /* ── Role display label ── */
  const roleLabel =
    profile?.role === 'staff'   ? 'Gate Operator' :
    profile?.role === 'admin'   ? 'Administrator' :
    profile?.role === 'student' ? 'Student'        : 'User';

  /* ── Active page label for mobile collapsed sidebar ── */
  void location; // used implicitly via NavLink

  return (
    <aside className="app-sidebar" role="navigation" aria-label="Main navigation">

      {/* ── Logo ── */}
      <div style={{
        padding: '22px 16px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Logo mark */}
          <div style={{
            width: 36, height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #C7F36B 0%, #A8D44E 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(199,243,107,0.30)',
            flexShrink: 0,
          }}>
            <Leaf size={20} color="#174C3C" strokeWidth={2.5} />
          </div>

          {/* Wordmark */}
          <div className="sidebar-wordmark">
            <div style={{
              color: '#fff',
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}>
              ParkSync
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.38)',
              fontSize: 9.5,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              lineHeight: 1.2,
            }}>
              Campus Parking
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
        {sections.map((section, si) => (
          <div key={si}>
            {section.heading && (
              <NavSection label={section.heading} />
            )}
            {section.items.map(item => (
              <NavItemLink key={item.to} item={item} />
            ))}
          </div>
        ))}
      </nav>

      {/* ── User footer ── */}
      <div style={{
        padding: '14px 12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}>
        {profile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px',
            borderRadius: 10,
            marginBottom: 8,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #C7F36B 0%, #A8D44E 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 12, color: '#174C3C',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(199,243,107,0.2)',
            }}>
              {initials}
            </div>

            {/* Name + role */}
            <div style={{ minWidth: 0, flex: 1 }} className="sidebar-user-text">
              <div style={{
                color: '#fff', fontSize: 13, fontWeight: 600,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                letterSpacing: '-0.01em',
              }}>
                {profile.full_name || 'User'}
              </div>
              <div style={{
                color: 'rgba(199,243,107,0.7)',
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginTop: 1,
              }}>
                {roleLabel}
              </div>
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={logout}
          aria-label="Sign out"
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '8px 10px',
            borderRadius: 9,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.52)',
            fontSize: 12.5,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            letterSpacing: '-0.01em',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.10)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.80)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.52)';
          }}
        >
          <LogOut size={13} strokeWidth={2} />
          <span className="sidebar-wordmark">Sign Out</span>
        </button>

        {/* Tagline */}
        <div style={{
          marginTop: 10,
          fontSize: 9.5,
          color: 'rgba(255,255,255,0.18)',
          textAlign: 'center',
          letterSpacing: '0.04em',
          fontWeight: 500,
        }} className="sidebar-wordmark">
          Park Smarter · A Cleaner Campus
        </div>
      </div>

      {/* Responsive collapse styles */}
      <style>{`
        @media (max-width: 768px) {
          .sidebar-wordmark { display: none !important; }
          .sidebar-user-text { display: none !important; }
        }
      `}</style>
    </aside>
  );
}
