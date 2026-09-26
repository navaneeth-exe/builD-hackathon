import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface TopBarProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function TopBar({ title, subtitle, children }: TopBarProps) {
  const { profile } = useAuth();

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : '?';

  return (
    <header className="app-topbar">
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#202923' }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 12, color: '#68736B', marginTop: 1 }}>{subtitle}</div>
        )}
      </div>

      {children}

      <button
        style={{
          width: 34, height: 34, borderRadius: 8,
          border: '1px solid #E5EAE4', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#68736B',
        }}
      >
        <Bell size={15} />
      </button>

      {profile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#174C3C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#C7F36B', fontSize: 11, fontWeight: 700,
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#202923', lineHeight: 1.2 }}>
              {profile.full_name || 'User'}
            </div>
            <div style={{ fontSize: 11, color: '#68736B', textTransform: 'capitalize' }}>{profile.role}</div>
          </div>
        </div>
      )}
    </header>
  );
}
