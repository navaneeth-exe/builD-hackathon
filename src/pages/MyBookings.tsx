import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, QrCode, Calendar, Clock } from 'lucide-react';
import TopBar from '../components/TopBar';
import StatusBadge from '../components/StatusBadge';
import QRPassModal from '../components/QRPassModal';
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

  useEffect(() => { load(); }, []);

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

      <div className="app-content" style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div className="tab-bar">
            <button
              className={`tab-btn${tab === 'upcoming' ? ' active' : ''}`}
              onClick={() => setTab('upcoming')}
            >
              Upcoming ({upcoming.length})
            </button>
            <button
              className={`tab-btn${tab === 'past' ? ' active' : ''}`}
              onClick={() => setTab('past')}
            >
              Past ({past.length})
            </button>
          </div>
          <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={() => navigate('/reserve')}>
            + Reserve Parking
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
            <div className="spinner" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={36} color="#C9CFC8" />
            <div style={{ fontSize: 15, fontWeight: 600, color: '#68736B' }}>
              {tab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
            </div>
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>
              {tab === 'upcoming' ? 'Reserve a parking slot to get started.' : 'Your completed bookings will appear here.'}
            </p>
            {tab === 'upcoming' && (
              <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => navigate('/reserve')}>
                Reserve Parking
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {displayed.map(b => {
              const slot = b.parking_slots;
              const area = slot?.parking_areas;
              const canCancel = b.status === 'CONFIRMED' && new Date(b.start_time) > now;

              return (
                <div key={b.id} className="ps-card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Slot badge */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: '#DDF5E5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 13, color: '#065F46', flexShrink: 0,
                    }}>
                      {slot?.slot_number ?? '—'}
                    </div>

                    {/* Main info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{slot?.slot_number}</span>
                        <span style={{ fontSize: 12, color: '#68736B' }}>{area?.name}</span>
                        <StatusBadge status={b.status} small />
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#68736B' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={11} />
                          {formatDate(b.start_time)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} />
                          {formatTime(b.start_time)} – {formatTime(b.end_time)} ({formatDuration(b.start_time, b.end_time)})
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '7px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
                        onClick={() => setQrBooking(b)}
                      >
                        <QrCode size={13} />
                        View QR
                      </button>
                      {canCancel && (
                        <button
                          className="btn-danger"
                          disabled={cancellingId === b.id}
                          onClick={() => handleCancel(b)}
                        >
                          {cancellingId === b.id ? 'Cancelling…' : 'Cancel Booking'}
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
