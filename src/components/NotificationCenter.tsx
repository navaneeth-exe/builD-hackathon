import { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useNavigate } from 'react-router-dom';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (n: any) => {
    if (!n.is_read) {
      markAsRead(n.id);
    }
    setIsOpen(false);
    
    // Route based on notification type / booking id
    if (n.related_booking_id) {
      navigate('/bookings'); // Or a specific route if we had one
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'BOOKING_CREATED': return <Check size={16} color="#174C3C" />;
      case 'BOOKING_CANCELLED': return <X size={16} color="#DC2626" />;
      case 'CHECKED_IN': return <CheckCheck size={16} color="#10B981" />;
      case 'COMPLETED': return <CheckCheck size={16} color="#3B82F6" />;
      default: return <Bell size={16} color="#68736B" />;
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="relative" ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 34, height: 34, borderRadius: 8,
          border: '1px solid #E5EAE4', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#68736B', position: 'relative'
        }}
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#C7F36B', color: '#174C3C',
            fontSize: 10, fontWeight: 800,
            width: 16, height: 16, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #F7F8F4'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          style={{
            position: 'absolute', top: 48, right: 0,
            width: 320, maxHeight: 400,
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(227, 235, 230, 0.8)',
            borderRadius: 24,
            zIndex: 1000,
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 48px rgba(23,76,60,0.12), 0 0 0 1px rgba(255,255,255,0.5) inset',
            overflow: 'hidden'
          }}
        >
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid #E5EAE4',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#174C3C' }}>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                style={{ 
                  background: 'none', border: 'none', 
                  fontSize: 12, color: '#174C3C', fontWeight: 600, 
                  cursor: 'pointer', opacity: 0.8 
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#909A94' }}>
                <Bell size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: 13 }}>You're all caught up!</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    padding: '12px 16px',
                    display: 'flex', gap: 12,
                    cursor: 'pointer',
                    background: n.is_read ? 'transparent' : '#F7F8F4',
                    borderLeft: n.is_read ? '3px solid transparent' : '3px solid #C7F36B',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F7F8F4'}
                  onMouseLeave={(e) => e.currentTarget.style.background = n.is_read ? 'transparent' : '#F7F8F4'}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: n.is_read ? '#E5EAE4' : '#174C3C',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, alignSelf: 'flex-start'
                  }}>
                    {getIconForType(n.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontSize: 13, fontWeight: n.is_read ? 600 : 700, 
                      color: '#202923', marginBottom: 4 
                    }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#68736B', lineHeight: 1.4, marginBottom: 6 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: 11, color: '#909A94', fontWeight: 500 }}>
                      {formatTime(n.created_at)}
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                    style={{
                      background: 'none', border: 'none', padding: 4,
                      color: '#909A94', cursor: 'pointer', alignSelf: 'flex-start'
                    }}
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
