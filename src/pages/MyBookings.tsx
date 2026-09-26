import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, QrCode, Calendar, Clock } from 'lucide-react';
import TopBar from '../components/TopBar';
import StatusBadge from '../components/StatusBadge';
import QRPassModal from '../components/QRPassModal';
import { supabase } from '../lib/supabase';
import { fetchMyBookings, cancelBooking, formatDate, formatTime, formatDuration } from '../api';
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

      <div className="app-content" style={{ maxWidth: 840, margin: '0 auto' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div className="soft-tab-bar" style={{ width: 280 }}>
            <button
              className={`soft-tab-btn${tab === 'upcoming' ? ' active' : ''}`}
              onClick={() => setTab('upcoming')}
            >
              Upcoming ({upcoming.length})
            </button>
            <button
              className={`soft-tab-btn${tab === 'past' ? ' active' : ''}`}
              onClick={() => setTab('past')}
            >
              History ({past.length})
            </button>
          </div>
          <button
            className="soft-btn-primary"
            style={{ width: 'auto', marginLeft: 'auto', padding: '10px 18px', fontSize: 13 }}
            onClick={() => navigate('/reserve')}
          >
            + New Reservation
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
            <div className="spinner" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="empty-state soft-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#EDF2EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <BookOpen size={28} color="#174C3C" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#174C3C', marginBottom: 4 }}>
              {tab === 'upcoming' ? 'No Upcoming Bookings' : 'No Booking History'}
            </div>
            <p style={{ fontSize: 13, color: '#68736B', maxWidth: 360, margin: '0 auto 16px' }}>
              {tab === 'upcoming' ? 'Reserve a parking slot anytime to guarantee your spot across campus.' : 'Your completed and cancelled reservations will be archived here.'}
            </p>
            {tab === 'upcoming' && (
              <button className="soft-btn-primary" style={{ width: 'auto', margin: '0 auto' }} onClick={() => navigate('/reserve')}>
                Book a Parking Spot
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {displayed.map(b => {
              const slot = b.parking_slots;
              const area = slot?.parking_areas;
              const canCancel = b.status === 'CONFIRMED' && new Date(b.start_time) > now;

              return (
                <div key={b.id} className="soft-card" style={{ padding: '18px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {/* Slot badge */}
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: '#DDF5E5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 14, color: '#065F46', flexShrink: 0,
                      boxShadow: '0 4px 10px rgba(6, 95, 70, 0.1)',
                    }}>
                      {slot?.slot_number ?? '—'}
                    </div>

                    {/* Main info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: '#174C3C' }}>Slot {slot?.slot_number}</span>
                        <span style={{ fontSize: 12.5, fontWeight: 500, color: '#68736B' }}>{area?.name}</span>
                        <StatusBadge status={b.status} small />
                      </div>
                      <div style={{ display: 'flex', gap: 18, fontSize: 12.5, color: '#68736B' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Calendar size={13} color="#174C3C" />
                          {formatDate(b.start_time)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Clock size={13} color="#174C3C" />
                          {formatTime(b.start_time)} – {formatTime(b.end_time)} ({formatDuration(b.start_time, b.end_time)})
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '9px 16px', borderRadius: 10, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                        onClick={() => setQrBooking(b)}
                      >
                        <QrCode size={14} color="#174C3C" />
                        Digital QR
                      </button>
                      {canCancel && (
                        <button
                          className="btn-danger"
                          style={{ borderRadius: 10, padding: '9px 14px', fontSize: 12.5 }}
                          disabled={cancellingId === b.id}
                          onClick={() => handleCancel(b)}
                        >
                          {cancellingId === b.id ? 'Cancelling…' : 'Cancel'}
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

