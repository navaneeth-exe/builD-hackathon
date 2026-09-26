import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import NotificationCenter from './NotificationCenter';
import { LogOut } from 'lucide-react';

interface TopBarProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function TopBar({ title, subtitle, children }: TopBarProps) {
  const { profile, logout } = useAuth();

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : '?';

  const roleLabel =
    profile?.role === 'staff'   ? 'Gate Operator' :
    profile?.role === 'admin'   ? 'Administrator' :
    profile?.role === 'student' ? 'Student'        : '';

  return (
    <header className="app-topbar" role="banner">
      {/* ── Page title block ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 700,
          fontSize: 15.5,
          color: '#1A2420',
          letterSpacing: '-0.025em',
          lineHeight: 1.2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{
            fontSize: 12,
            color: '#627068',
            marginTop: 2,
            fontWeight: 400,
            letterSpacing: '-0.005em',
            lineHeight: 1.3,
          }}>
            {subtitle}
          </div>
        )}
      </div>

      {/* ── Slot for page-specific action buttons ── */}
      {children && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {children}
        </div>
      )}

      {/* ── Notification bell ── */}
      <NotificationCenter />

      {/* ── Divider ── */}
      {profile && (
        <div style={{
          width: 1,
          height: 28,
          background: '#E3EBE6',
          flexShrink: 0,
        }} />
      )}

      {/* ── User identity chip ── */}
      {profile && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '5px 10px 5px 5px',
          borderRadius: 10,
          background: '#F4F1E8',
          border: '1px solid #E3EBE6',
          cursor: 'default',
          flexShrink: 0,
        }}>
          {/* Avatar */}
          <div style={{
            width: 30, height: 30,
            borderRadius: 8,
            background: '#174C3C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#C7F36B',
            fontSize: 11,
            fontWeight: 800,
            flexShrink: 0,
            letterSpacing: '0.02em',
            boxShadow: '0 2px 6px rgba(23,76,60,0.22)',
          }}>
            {initials}
          </div>

          {/* Name + role */}
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#1A2420',
              lineHeight: 1.2,
              letterSpacing: '-0.015em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 160,
            }}>
              {profile.full_name || 'User'}
            </div>
            {roleLabel && (
              <div style={{
                fontSize: 10.5,
                color: '#627068',
                lineHeight: 1.2,
                fontWeight: 500,
                textTransform: 'capitalize',
              }}>
                {roleLabel}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Mobile Logout */}
      {profile && (
        <button 
          onClick={logout}
          className="mobile-logout-btn"
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: '#DC2626',
            cursor: 'pointer',
            padding: '8px',
          }}
        >
          <LogOut size={20} />
        </button>
      )}
    </header>
  );
}
