import { useState, useEffect, useRef } from 'react';
import { QrCode, Keyboard, CheckCircle, XCircle } from 'lucide-react';
import TopBar from '../components/TopBar';
import StatusBadge from '../components/StatusBadge';
import { fetchBookingByCode, updateBookingStatus } from '../api';
import type { Booking } from '../types';
import { formatDate, formatTime } from '../api';

type Mode = 'scan' | 'manual';

function parseScannedCode(rawText: string): string {
  let text = (rawText || '').trim();
  if (!text) return '';

  // If URL, extract parameter or last path segment
  if (text.startsWith('http://') || text.startsWith('https://')) {
    try {
      const url = new URL(text);
      const codeParam = url.searchParams.get('code') || url.searchParams.get('id') || url.searchParams.get('booking_code');
      if (codeParam) return codeParam.trim();
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length > 0) return segments[segments.length - 1].trim();
    } catch (_) {}
  }

  // If JSON
  if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('"') && text.endsWith('"'))) {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'string') return parsed.trim();
      if (parsed.booking_code) return String(parsed.booking_code).trim();
      if (parsed.reference_code) return String(parsed.reference_code).trim();
      if (parsed.code) return String(parsed.code).trim();
      if (parsed.id) return String(parsed.id).trim();
    } catch (_) {}
  }

  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    text = text.slice(1, -1).trim();
  }

  return text;
}

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
  const isProcessingRef = useRef(false);

  const stopScanner = async () => {
    if (scannerRef.current) {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        scanner.clear();
      } catch (e) {
        console.warn('Scanner cleanup:', e);
      }
    }
  };

  // Attempt camera scan via html5-qrcode
  useEffect(() => {
    if (mode !== 'scan' || !cameraOn) {
      stopScanner();
      return;
    }

    let isMounted = true;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!isMounted) return;
      const el = document.getElementById('qr-reader-el');
      if (!el) return;

      const html5QrCode = new Html5Qrcode('qr-reader-el');
      scannerRef.current = html5QrCode;

      html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        async (decodedText: string) => {
          if (isProcessingRef.current || !isMounted) return;
          isProcessingRef.current = true;

          try {
            await stopScanner();
          } catch (_) {}

          setCameraOn(false);
          const clean = parseScannedCode(decodedText);
          setInputCode(clean);
          handleValidate(clean);

          setTimeout(() => {
            isProcessingRef.current = false;
          }, 600);
        },
        () => {}
      ).catch((err) => {
        console.warn('Camera error:', err);
        setError('Camera not available or access denied. Use manual entry below.');
        setCameraOn(false);
      });
    });

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [cameraOn, mode]);

  async function handleValidate(code?: string) {
    const raw = code !== undefined ? code : inputCode;
    const c = parseScannedCode(raw);
    if (!c) { setError('Enter a booking ID or scan a pass.'); return; }

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
      setError(e.message ?? 'No booking found with that ID.');
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

                  <div 
                    id="qr-reader-el" 
                    ref={videoRef as any} 
                    style={{ width: '100%', height: '100%', display: cameraOn ? 'block' : 'none' }} 
                  />
                  {!cameraOn && (
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
                    {booking.parking_slots?.slot_number ?? '—'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{booking.parking_slots?.slot_number ?? 'Assigned Slot'}</div>
                    <div style={{ fontSize: 11.5, color: '#68736B' }}>{booking.parking_slots?.parking_areas?.name ?? 'Campus Lot'}</div>
                  </div>
                </div>

                {[
                  { label: 'Date', value: booking.start_time ? formatDate(booking.start_time) : 'N/A' },
                  { label: 'Time', value: booking.start_time && booking.end_time ? `${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}` : 'N/A' },
                  { label: 'Booking ID', value: booking.booking_code || 'N/A' },
                  { label: 'User', value: booking.user_name || 'N/A' },
                  { label: 'Vehicle Plate', value: booking.license_plate && booking.license_plate !== 'N/A' ? booking.license_plate : 'N/A' },
                ].map(r => (
                  <div key={r.label} style={{
                    display: 'flex', padding: '7px 0', borderBottom: '1px solid #F0F2EF', fontSize: 12.5,
                  }}>
                    <span style={{ color: '#68736B', width: 90 }}>{r.label}</span>
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

            {loading && (
              <div className="ps-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
                <div style={{ fontSize: 13, color: '#68736B', fontWeight: 500 }}>Loading booking details...</div>
              </div>
            )}

            {!booking && !error && !success && !loading && (
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
