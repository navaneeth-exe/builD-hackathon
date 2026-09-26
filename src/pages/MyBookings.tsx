import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, QrCode, Clock, MapPin, XCircle } from 'lucide-react';
import TopBar from '../components/TopBar';
import StatusBadge from '../components/StatusBadge';
import QRPassModal from '../components/QRPassModal';
import { supabase } from '../lib/supabase';
import { fetchMyBookings, cancelBooking, formatTime, formatDuration } from '../api';
import type { Booking } from '../types';
import { useAuth } from '../contexts/AuthContext';

export default function MyBookings() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const showQRId = (location.state as any)?.showQR as string | undefined;

  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [qrBooking, setQrBooking] = useState<Booking | null>(null);

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const data = await fetchMyBookings();
      setBookings(data);
      if (showQRId) {
        const found = data.find((b: Booking) => b.id === showQRId);
        if (found) setQrBooking(found);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const channel = supabase
      .channel('my-bookings-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
        load();
      })
      .subscribe();

    const interval = setInterval(load, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const now = new Date();
  const upcoming = bookings.filter(b =>
    ['CONFIRMED', 'CHECKED_IN'].includes(b.status) && new Date(b.end_time) >= now
  );
  const past = bookings.filter(b =>
    ['COMPLETED', 'CANCELLED'].includes(b.status) || new Date(b.end_time) < now
  );

  const displayed = tab === 'upcoming' ? upcoming : past;

  async function handleCancel(b: Booking) {
    if (!confirm(`Cancel booking ${b.booking_code}? This cannot be undone.`)) return;
    setCancellingId(b.id);
    try {
      await cancelBooking(b.id);
      await load();
    } catch (e: any) {
      alert(e.message ?? 'Failed to cancel booking.');
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <>
      <TopBar title="My Bookings" subtitle="View and manage your parking reservations" />
      {qrBooking && <QRPassModal booking={qrBooking} onClose={() => setQrBooking(null)} />}

      <div className="app-content" style={{ maxWidth: 900, margin: '0 auto', padding: '32px' }}>
        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div className="soft-tab-bar" style={{ width: 280, padding: 6, background: '#FFFFFF', borderRadius: 16, boxShadow: '0 4px 12px rgba(23,76,60,0.03), inset 0 2px 4px rgba(255,255,255,1)' }}>
            <button
              className={`soft-tab-btn${tab === 'upcoming' ? ' active' : ''}`}
              onClick={() => setTab('upcoming')}
              style={{ borderRadius: 12, padding: '10px 16px', fontWeight: tab === 'upcoming' ? 700 : 600 }}
            >
              Upcoming <span style={{ background: tab === 'upcoming' ? '#DDF5E5' : '#F0F4F1', color: tab === 'upcoming' ? '#059669' : '#9AADA5', padding: '2px 8px', borderRadius: 10, marginLeft: 6, fontSize: 11 }}>{upcoming.length}</span>
            </button>
            <button
              className={`soft-tab-btn${tab === 'past' ? ' active' : ''}`}
              onClick={() => setTab('past')}
              style={{ borderRadius: 12, padding: '10px 16px', fontWeight: tab === 'past' ? 700 : 600 }}
            >
              History <span style={{ background: tab === 'past' ? '#DDF5E5' : '#F0F4F1', color: tab === 'past' ? '#059669' : '#9AADA5', padding: '2px 8px', borderRadius: 10, marginLeft: 6, fontSize: 11 }}>{past.length}</span>
            </button>
          </div>
          <button
            className="soft-btn-primary"
            style={{ padding: '12px 20px', fontSize: 14, boxShadow: '0 8px 16px rgba(23,76,60,0.1)' }}
            onClick={() => navigate('/reserve')}
          >
            + New Reservation
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
            <div className="spinner" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="empty-state soft-card" style={{ padding: '64px 32px', textAlign: 'center', borderRadius: 32, border: '1px dashed #D5DDD6', background: '#F9FBF9' }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 12px 24px rgba(23,76,60,0.06)' }}>
              <BookOpen size={32} color="#174C3C" />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#174C3C', marginBottom: 8, letterSpacing: '-0.02em' }}>
              {tab === 'upcoming' ? 'No Upcoming Bookings' : 'No Booking History'}
            </div>
            <p style={{ fontSize: 14, color: '#68736B', maxWidth: 400, margin: '0 auto 24px', lineHeight: 1.6 }}>
              {tab === 'upcoming' ? 'Reserve a parking spot ahead of time to guarantee your place on campus.' : 'Your completed and cancelled reservations will appear here.'}
            </p>
            {tab === 'upcoming' && (
              <button className="soft-btn-primary" style={{ margin: '0 auto' }} onClick={() => navigate('/reserve')}>
                Book a Parking Spot
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 20 }}>
            {displayed.map(b => {
              const slot = b.parking_slots;
              const area = slot?.parking_areas;
              const canCancel = b.status === 'CONFIRMED' && new Date(b.start_time) > now;
              const isActive = b.status === 'CONFIRMED' || b.status === 'CHECKED_IN';

              return (
                <div key={b.id} className="soft-card" style={{ 
                    padding: 0, overflow: 'hidden', borderRadius: 24, 
                    display: 'flex', border: '1px solid #E3EBE6',
                    boxShadow: isActive ? '0 12px 32px rgba(23,76,60,0.06)' : '0 4px 12px rgba(0,0,0,0.02)',
                    opacity: isActive ? 1 : 0.7
                }}>
                  {/* Status Indicator Stripe */}
                  <div style={{ width: 8, background: isActive ? '#C7F36B' : '#EAEFEA' }} />
                  
                  <div style={{ flex: 1, display: 'flex', padding: '24px', alignItems: 'center', gap: 24 }}>
                      {/* Left: Date & Time Box */}
                      <div style={{ 
                          width: 100, height: 100, borderRadius: 16, background: '#F8FAF7', border: '1px solid #EAEFEA',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                      }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#627068', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                             {new Date(b.start_time).toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                          <div style={{ fontSize: 32, fontWeight: 800, color: '#1A2420', lineHeight: 1 }}>
                             {new Date(b.start_time).getDate()}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#9AADA5', marginTop: 4 }}>
                             {formatTime(b.start_time)}
                          </div>
                      </div>

                      {/* Middle: Details */}
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 24, borderRight: '1px dashed #E3EBE6' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                             <h4 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#174C3C' }}>Slot {slot?.slot_number}</h4>
                             <StatusBadge status={b.status} small />
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#627068', fontWeight: 500 }}>
                                <MapPin size={14} color="#174C3C" /> {area?.name} · {slot?.slot_type}
                             </div>
                             <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#627068', fontWeight: 500 }}>
                                <Clock size={14} color="#174C3C" /> Duration: {formatDuration(b.start_time, b.end_time)}
                             </div>
                          </div>
                      </div>

                      {/* Right: Actions */}
                      <div style={{ width: 140, display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {isActive ? (
                             <button
                               className="soft-btn-primary"
                               style={{ padding: '12px', fontSize: 13, borderRadius: 12, justifyContent: 'center' }}
                               onClick={() => setQrBooking(b)}
                             >
                               <QrCode size={16} /> View Pass
                             </button>
                          ) : (
                             <button
                               className="btn-secondary"
                               style={{ padding: '12px', fontSize: 13, borderRadius: 12, justifyContent: 'center', border: '1px solid #EAEFEA', background: '#F8FAF7' }}
                               onClick={() => setQrBooking(b)}
                             >
                               <BookOpen size={16} /> Details
                             </button>
                          )}
                          
                          {canCancel && (
                             <button
                               style={{ 
                                   padding: '10px', fontSize: 12, borderRadius: 12, 
                                   border: 'none', background: 'transparent', color: '#DC2626',
                                   fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                   transition: 'background 0.2s'
                               }}
                               onMouseOver={e => e.currentTarget.style.background = '#FEF2F2'}
                               onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                               disabled={cancellingId === b.id}
                               onClick={() => handleCancel(b)}
                             >
                               {cancellingId === b.id ? 'Cancelling…' : <><XCircle size={14}/> Cancel</>}
                             </button>
                          )}
                      </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

