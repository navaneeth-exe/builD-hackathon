import { useState, useEffect, useRef } from 'react';
import { QrCode, Keyboard, CheckCircle, XCircle, Search, ShieldCheck, Camera, CameraOff } from 'lucide-react';
import TopBar from '../components/TopBar';
import StatusBadge from '../components/StatusBadge';
import { fetchBookingByCode, updateBookingStatus } from '../api';
import type { Booking } from '../types';
import { formatDate, formatTime } from '../api';

type Mode = 'scan' | 'manual';

function parseScannedCode(rawText: string): string {
  let text = (rawText || '').trim();
  if (!text) return '';

  if (text.startsWith('http://') || text.startsWith('https://')) {
    try {
      const url = new URL(text);
      const codeParam = url.searchParams.get('code') || url.searchParams.get('id') || url.searchParams.get('booking_code');
      if (codeParam) return codeParam.trim();
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length > 0) return segments[segments.length - 1].trim();
    } catch (_) {}
  }

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
        { fps: 10, qrbox: { width: 220, height: 220 } },
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
      setSuccess('Vehicle Checked In Successfully');
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
      setSuccess('Vehicle Checked Out Successfully');
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
      <TopBar title="Pass Validation" subtitle="Scan digital QR passes or enter IDs manually" />
      <div className="app-content">
        <div className="scan-grid" style={{ alignItems: 'start', maxWidth: 1040, margin: '0 auto' }}>
          
          {/* Left: scanner or manual */}
          <div className="soft-card" style={{ padding: '32px', borderRadius: 28, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 520, background: '#FFFFFF', boxShadow: '0 24px 48px rgba(23,76,60,0.04)' }}>
            {/* Mode tabs */}
            <div className="soft-tab-bar" style={{ marginBottom: 32, padding: 6, background: '#F8FAF7', borderRadius: 16, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
              <button 
                className={`soft-tab-btn${mode === 'scan' ? ' active' : ''}`} 
                onClick={() => setMode('scan')}
                style={{ borderRadius: 12, padding: '12px', fontWeight: mode === 'scan' ? 700 : 600 }}
              >
                <QrCode size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Scanner Mode
              </button>
              <button 
                className={`soft-tab-btn${mode === 'manual' ? ' active' : ''}`} 
                onClick={() => setMode('manual')}
                style={{ borderRadius: 12, padding: '12px', fontWeight: mode === 'manual' ? 700 : 600 }}
              >
                <Keyboard size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Manual Entry
              </button>
            </div>

            {mode === 'scan' ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {/* Scanner frame */}
                <div style={{
                  width: '100%',
                  maxWidth: 320,
                  aspectRatio: '1/1',
                  background: '#0B1510',
                  borderRadius: 32,
                  margin: '0 auto 24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', overflow: 'hidden',
                  boxShadow: '0 24px 48px rgba(11, 21, 16, 0.4), inset 0 4px 12px rgba(255,255,255,0.1)',
                }}>
                  {/* Neon Corner marks */}
                  {[['0','0','top-left'], ['0','auto','bottom-left'], ['auto','0','top-right'], ['auto','auto','bottom-right']].map(([, , k]) => (
                    <div key={k} style={{
                      position: 'absolute',
                      ...(k.includes('top') ? { top: 24 } : { bottom: 24 }),
                      ...(k.includes('left') ? { left: 24 } : { right: 24 }),
                      width: 40, height: 40,
                      borderColor: '#C7F36B', borderStyle: 'solid', borderRadius: 8,
                      borderWidth: k.includes('top-left') ? '4px 0 0 4px' :
                        k.includes('top-right') ? '4px 4px 0 0' :
                        k.includes('bottom-left') ? '0 0 4px 4px' : '0 4px 4px 0',
                      boxShadow: '0 0 20px rgba(199,243,107,0.4)',
                      opacity: cameraOn ? 1 : 0.4,
                      transition: 'opacity 0.3s'
                    }} />
                  ))}

                  <div 
                    id="qr-reader-el" 
                    ref={videoRef as any} 
                    style={{ width: '100%', height: '100%', display: cameraOn ? 'block' : 'none', objectFit: 'cover' }} 
                  />
                  {!cameraOn && (
                    <div style={{ padding: 20, textAlign: 'center' }}>
                      <div style={{
                        width: 72, height: 72, borderRadius: 20, background: 'rgba(199, 243, 107, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                        border: '1px solid rgba(199,243,107,0.2)'
                      }}>
                        <QrCode size={36} color="#C7F36B" />
                      </div>
                      <div style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 700, letterSpacing: '0.02em' }}>
                        Scanner Offline
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 6 }}>
                        Activate camera to begin scanning
                      </div>
                    </div>
                  )}
                </div>

                <button
                  className="soft-btn-primary"
                  style={{ gap: 10, padding: '14px 28px', borderRadius: 16, fontWeight: 700, fontSize: 14, boxShadow: '0 12px 24px rgba(23,76,60,0.15)' }}
                  onClick={() => setCameraOn(prev => !prev)}
                >
                  {cameraOn ? (
                    <>
                      <CameraOff size={18} /> Turn Off Camera
                    </>
                  ) : (
                    <>
                      <Camera size={18} /> Activate Scanner
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ background: '#F8FAF7', padding: '32px', borderRadius: 24, border: '1px solid #EAEFEA' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 0 20px 0', boxShadow: '0 8px 16px rgba(23,76,60,0.06)' }}>
                     <Keyboard size={28} color="#174C3C" />
                  </div>
                  <label style={{ display: 'block', fontSize: 16, fontWeight: 800, color: '#1A2420', marginBottom: 8, letterSpacing: '-0.01em' }}>
                    Manual Validation
                  </label>
                  <p style={{ fontSize: 14, color: '#627068', marginBottom: 24 }}>
                    Enter the booking reference code if the QR pass cannot be scanned.
                  </p>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <input
                      className="soft-input"
                      placeholder="e.g. PS-20241021-001"
                      value={inputCode}
                      onChange={e => setInputCode(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleValidate()}
                      autoFocus
                      style={{ flex: 1, padding: '16px', fontSize: 15 }}
                    />
                    <button className="soft-btn-primary" style={{ width: 'auto', padding: '0 24px', borderRadius: 14 }} onClick={() => handleValidate()} disabled={loading}>
                      {loading ? '…' : <Search size={20}/>}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: booking details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '16px 20px', background: '#FEF2F2',
                border: '1px solid #FEE2E2', borderRadius: 20,
                boxShadow: '0 8px 24px rgba(220, 38, 38, 0.08)',
              }}>
                <XCircle size={20} color="#DC2626" style={{ marginTop: 2 }} />
                <span style={{ fontSize: 14, color: '#991B1B', fontWeight: 600, lineHeight: 1.5 }}>{error}</span>
              </div>
            )}

            {success && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '16px 20px', background: '#ECFDF5',
                border: '1px solid #D1FAE5', borderRadius: 20,
                boxShadow: '0 8px 24px rgba(5, 150, 105, 0.08)',
              }}>
                <CheckCircle size={20} color="#059669" />
                <span style={{ fontSize: 14, color: '#065F46', fontWeight: 700 }}>{success}</span>
              </div>
            )}

            {booking && (
              <div className="soft-card" style={{ padding: '32px', borderRadius: 28, background: '#FFFFFF', boxShadow: '0 24px 48px rgba(23,76,60,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottom: '2px dashed #E3EBE6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                     <ShieldCheck size={24} color="#174C3C" />
                     <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1A2420' }}>Pass Verified</h3>
                  </div>
                  <StatusBadge status={booking.status} />
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
                  padding: '16px', background: '#F8FAF7', borderRadius: 16, border: '1px solid #EAEFEA',
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: '#C7F36B', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 20, color: '#174C3C', boxShadow: '0 8px 16px rgba(199,243,107,0.3)'
                  }}>
                    {booking.parking_slots?.slot_number ?? '—'}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#627068', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Slot</div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: '#174C3C', marginTop: 2 }}>{booking.parking_slots?.parking_areas?.name ?? 'Campus Lot'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Date', value: booking.start_time ? formatDate(booking.start_time) : 'N/A' },
                    { label: 'Time', value: booking.start_time && booking.end_time ? `${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}` : 'N/A' },
                    { label: 'Booking ID', value: booking.booking_code || 'N/A' },
                    { label: 'User', value: booking.user_name || 'N/A' },
                    { label: 'Vehicle Plate', value: booking.license_plate && booking.license_plate !== 'N/A' ? booking.license_plate : 'N/A' },
                  ].map(r => (
                    <div key={r.label} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                      padding: '12px 16px', background: '#F8FAF7', borderRadius: 12, fontSize: 13,
                    }}>
                      <span style={{ color: '#627068', fontWeight: 600 }}>{r.label}</span>
                      <span style={{ fontWeight: 700, color: '#1A2420', fontFamily: r.label === 'Booking ID' ? 'monospace' : undefined, fontSize: r.label === 'Booking ID' ? 14 : 13 }}>{r.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                  <button
                    className="soft-btn-primary"
                    style={{ flex: 1, padding: '16px', fontSize: 14, borderRadius: 16, justifyContent: 'center', boxShadow: '0 12px 24px rgba(23,76,60,0.15)' }}
                    disabled={booking.status !== 'CONFIRMED' || actionLoading}
                    onClick={handleCheckin}
                  >
                    {actionLoading ? '…' : 'Confirm Check-In'}
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ flex: 1, padding: '16px', borderRadius: 16, fontSize: 14, fontWeight: 700, justifyContent: 'center' }}
                    disabled={booking.status !== 'CHECKED_IN' || actionLoading}
                    onClick={handleCheckout}
                  >
                    {actionLoading ? '…' : 'Check-Out'}
                  </button>
                </div>

                <button className="btn-secondary" style={{ width: '100%', marginTop: 12, fontSize: 13, borderRadius: 14, padding: '14px', border: 'none', background: 'transparent' }} onClick={reset}>
                  Scan Another Code
                </button>
              </div>
            )}

            {loading && (
              <div className="soft-card" style={{ textAlign: 'center', padding: '64px 32px', borderRadius: 28 }}>
                 <div className="spinner" style={{ margin: '0 auto 16px' }} />
                <div style={{ fontSize: 14, color: '#174C3C', fontWeight: 700 }}>Validating pass securely…</div>
              </div>
            )}

            {!booking && !error && !success && !loading && (
              <div className="soft-card" style={{ textAlign: 'center', padding: '64px 32px', borderRadius: 28, background: '#F8FAF7', border: '1px dashed #D5DDD6' }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 16px rgba(23,76,60,0.06)' }}>
                  <ShieldCheck size={32} color="#174C3C" />
                </div>
                <div style={{ fontSize: 18, color: '#174C3C', fontWeight: 800, letterSpacing: '-0.02em' }}>Ready for Validation</div>
                <p style={{ fontSize: 14, color: '#68736B', marginTop: 8, lineHeight: 1.5 }}>
                  Scan a digital QR pass or enter the booking code manually to verify details.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

