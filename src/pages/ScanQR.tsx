import { useState, useEffect, useRef } from 'react';
import { QrCode, Keyboard, CheckCircle, XCircle } from 'lucide-react';
import TopBar from '../components/TopBar';
import StatusBadge from '../components/StatusBadge';
import { fetchBookingByCode, updateBookingStatus, fetchAllBookings } from '../api';
import type { Booking } from '../types';
import { formatDate, formatTime } from '../api';

type Mode = 'scan' | 'manual';

export default function ScanQR() {
  const [mode, setMode] = useState<Mode>('scan');
  const [inputCode, setInputCode] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);

  // Attempt camera scan via html5-qrcode
  useEffect(() => {
    if (mode !== 'scan' || !cameraOn) return;

    let mounted = true;
    let html5QrCode: any;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!mounted || !videoRef.current) return;
      const id = 'qr-reader-el';
      const el = document.getElementById(id);
      if (!el) return;
      html5QrCode = new Html5Qrcode(id);
      scannerRef.current = html5QrCode;

      html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        (decodedText: string) => {
          html5QrCode.stop();
          setCameraOn(false);
          setInputCode(decodedText);
          handleValidate(decodedText);
        },
        () => {}
      ).catch(() => {
        setError('Camera not available. Use manual entry below.');
        setCameraOn(false);
      });
    });

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [cameraOn, mode]);

  async function handleValidate(code?: string) {
    const c = (code ?? inputCode).trim();
    if (!c) { setError('Enter a booking ID.'); return; }

    setLoading(true);
    setError('');
    setSuccess('');
    setBooking(null);

    try {
      const b = await fetchBookingByCode(c);

      if (b.status === 'CANCELLED') throw new Error('Booking is cancelled.');
      if (b.status === 'COMPLETED') throw new Error('Booking is already completed.');

      setBooking(b);
    } catch (e: any) {
      setError(e.message?.includes('PGRST116') ? 'No booking found with that ID.' : (e.message ?? 'Validation failed.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckin() {
    if (!booking) return;
    if (booking.status === 'CHECKED_IN') { setError('Already checked in.'); return; }
    if (booking.status !== 'CONFIRMED') { setError('Cannot check in — invalid booking status.'); return; }

    setActionLoading(true);
    try {
      await updateBookingStatus(booking.id, 'CHECKED_IN');
      setSuccess('✅ Check-in successful!');
      setBooking({ ...booking, status: 'CHECKED_IN' });
    } catch (e: any) {
      setError(e.message ?? 'Check-in failed.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCheckout() {
    if (!booking) return;
    if (booking.status !== 'CHECKED_IN') { setError('Vehicle is not checked in.'); return; }

    setActionLoading(true);
    try {
      await updateBookingStatus(booking.id, 'COMPLETED');
      setSuccess('✅ Check-out successful!');
      setBooking({ ...booking, status: 'COMPLETED' });
    } catch (e: any) {
      setError(e.message ?? 'Check-out failed.');
    } finally {
      setActionLoading(false);
    }
  }

  function reset() {
    setBooking(null);
    setError('');
    setSuccess('');
    setInputCode('');
    setCameraOn(false);
  }

  return (
    <>
      <TopBar title="Scan QR Pass" subtitle="Scan a QR pass or enter booking ID to validate" />
      <div className="app-content">
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start', maxWidth: 960, margin: '0 auto' }}>
          {/* Left: scanner or manual */}
          <div className="ps-card">
            {/* Mode tabs */}
            <div className="tab-bar" style={{ marginBottom: 20, maxWidth: 280 }}>
              <button className={`tab-btn${mode === 'scan' ? ' active' : ''}`} onClick={() => setMode('scan')}>
                <QrCode size={13} style={{ marginRight: 4 }} /> Scan QR
              </button>
              <button className={`tab-btn${mode === 'manual' ? ' active' : ''}`} onClick={() => setMode('manual')}>
                <Keyboard size={13} style={{ marginRight: 4 }} /> Enter Booking ID
              </button>
            </div>

            {mode === 'scan' ? (
              <div style={{ textAlign: 'center' }}>
                {/* Scanner frame */}
                <div style={{
                  width: 260, height: 260,
                  background: '#1a1a2e',
                  borderRadius: 12,
                  margin: '0 auto 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {/* Corner marks */}
                  {[['0','0','top-left'], ['0','auto','bottom-left'], ['auto','0','top-right'], ['auto','auto','bottom-right']].map(([, , k]) => (
                    <div key={k} style={{
                      position: 'absolute',
                      ...(k.includes('top') ? { top: 16 } : { bottom: 16 }),
                      ...(k.includes('left') ? { left: 16 } : { right: 16 }),
                      width: 24, height: 24,
                      borderColor: '#C7F36B', borderStyle: 'solid', borderRadius: 2,
                      borderWidth: k.includes('top-left') ? '3px 0 0 3px' :
                        k.includes('top-right') ? '3px 3px 0 0' :
                        k.includes('bottom-left') ? '0 0 3px 3px' : '0 3px 3px 0',
                    }} />
                  ))}

                  {cameraOn ? (
                    <div id="qr-reader-el" ref={videoRef as any} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <div>
                      <QrCode size={48} color="rgba(255,255,255,0.2)" />
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 10 }}>
                        Position the QR code within the frame
                      </div>
                    </div>
                  )}
                </div>

                <button
                  className="btn-secondary"
                  style={{ gap: 6 }}
                  onClick={() => setCameraOn(prev => !prev)}
                >
                  {cameraOn ? '⏹ Stop Camera' : '📷 Turn on Camera'}
                </button>

                <div style={{ margin: '16px 0', color: '#9CA3AF', fontSize: 12 }}>— or enter manually —</div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="ps-input"
                    placeholder="e.g. PS-20241021-001"
                    value={inputCode}
                    onChange={e => setInputCode(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleValidate()}
                  />
                  <button className="btn-primary" onClick={() => handleValidate()} disabled={loading}>
                    {loading ? '…' : 'Validate'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="ps-label">Booking ID</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="ps-input"
                    placeholder="e.g. PS-20241021-001"
                    value={inputCode}
                    onChange={e => setInputCode(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleValidate()}
                    autoFocus
                  />
                  <button className="btn-primary" onClick={() => handleValidate()} disabled={loading}>
                    {loading ? '…' : 'Validate'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: booking details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', background: '#FCE2E2',
                border: '1px solid #FCA5A5', borderRadius: 10,
              }}>
                <XCircle size={16} color="#B91C1C" />
                <span style={{ fontSize: 13, color: '#B91C1C', fontWeight: 500 }}>{error}</span>
              </div>
            )}

            {success && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', background: '#DDF5E5',
                border: '1px solid #A7E8BC', borderRadius: 10,
              }}>
                <CheckCircle size={16} color="#065F46" />
                <span style={{ fontSize: 13, color: '#065F46', fontWeight: 500 }}>{success}</span>
              </div>
            )}

            {booking && (
              <div className="ps-card">
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  Booking Details
                  <StatusBadge status={booking.status} />
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
                  padding: '10px 12px', background: '#F7FBF8', borderRadius: 8,
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 8,
                    background: '#DDF5E5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 12, color: '#065F46',
                  }}>
                    {booking.parking_slots?.slot_number}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{booking.parking_slots?.slot_number}</div>
                    <div style={{ fontSize: 11.5, color: '#68736B' }}>{booking.parking_slots?.parking_areas?.name}</div>
                  </div>
                </div>

                {[
                  { label: 'Date', value: formatDate(booking.start_time) },
                  { label: 'Time', value: `${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}` },
                  { label: 'Booking ID', value: booking.booking_code },
                  { label: 'User', value: booking.user_name },
                ].map(r => (
                  <div key={r.label} style={{
                    display: 'flex', padding: '7px 0', borderBottom: '1px solid #F0F2EF', fontSize: 12.5,
                  }}>
                    <span style={{ color: '#68736B', width: 80 }}>{r.label}</span>
                    <span style={{ fontWeight: 500, fontFamily: r.label === 'Booking ID' ? 'monospace' : undefined }}>{r.value}</span>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button
                    className="btn-primary"
                    style={{ flex: 1 }}
                    disabled={booking.status !== 'CONFIRMED' || actionLoading}
                    onClick={handleCheckin}
                  >
                    {actionLoading ? '…' : 'Check In'}
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ flex: 1 }}
                    disabled={booking.status !== 'CHECKED_IN' || actionLoading}
                    onClick={handleCheckout}
                  >
                    {actionLoading ? '…' : 'Check Out'}
                  </button>
                </div>

                <button className="btn-secondary" style={{ width: '100%', marginTop: 8, fontSize: 12 }} onClick={reset}>
                  Scan Another
                </button>
              </div>
            )}

            {!booking && !error && !success && (
              <div className="ps-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
                <QrCode size={32} color="#C9CFC8" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 13, color: '#68736B', fontWeight: 500 }}>Booking Details</div>
                <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                  Scan a QR code or enter a booking ID to view details.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
