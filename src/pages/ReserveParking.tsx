import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, Calendar, Clock, MapPin, Car, ShieldCheck, AlertCircle } from 'lucide-react';
import TopBar from '../components/TopBar';
import ParkingGrid, { ParkingLegend } from '../components/ParkingGrid';
import { supabase } from '../lib/supabase';
import {
  fetchParkingAreas, fetchSlotsForArea, fetchConflictingSlotIds,
  computeSlotStatus, createBooking,
} from '../api';
import type { ParkingArea, SlotWithStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildISO(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}`).toISOString();
}

// Steps
type Step = 1 | 2 | 3;

export default function ReserveParking() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const preSelected = location.state as { slot?: SlotWithStatus; area?: ParkingArea } | null;

  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setMinutes(Math.ceil(now.getMinutes() / 30) * 30, 0, 0);
  const defaultEnd = new Date(defaultStart.getTime() + 2 * 3600000);

  const [step, setStep] = useState<Step>(1);
  const [areas, setAreas] = useState<ParkingArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<ParkingArea | null>(preSelected?.area ?? null);
  const [dateStr, setDateStr] = useState(toLocalInput(now));
  const [startTime, setStartTime] = useState(toTimeInput(defaultStart));
  const [endTime, setEndTime] = useState(toTimeInput(defaultEnd));
  const [licensePlate, setLicensePlate] = useState('');
  const [slots, setSlots] = useState<SlotWithStatus[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotWithStatus | null>(preSelected?.slot ?? null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);

  useEffect(() => {
    fetchParkingAreas().then(d => {
      setAreas(d);
      if (!selectedArea && d.length > 0) setSelectedArea(d[0]);
    });
  }, []);

  const getISODates = useCallback(() => {
    const startISO = buildISO(dateStr, startTime);
    let endISO = buildISO(dateStr, endTime);
    // If end time is earlier in the day than start time, assume it's the next day
    if (endTime <= startTime) {
      const endDate = new Date(`${dateStr}T${endTime}`);
      endDate.setDate(endDate.getDate() + 1);
      endISO = endDate.toISOString();
    }
    return { startISO, endISO };
  }, [dateStr, startTime, endTime]);

  const loadAvailability = useCallback(async () => {
    if (!selectedArea || !dateStr || !startTime || !endTime) return;
    const { startISO, endISO } = getISODates();

    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const [rawSlots, conflictIds] = await Promise.all([
        fetchSlotsForArea(selectedArea.id),
        fetchConflictingSlotIds(selectedArea.id, startISO, endISO),
      ]);
      const withStatus: SlotWithStatus[] = rawSlots.map((s: any) => ({
        ...s,
        status: computeSlotStatus(s, conflictIds),
      }));
      setSlots(withStatus);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedArea, dateStr, startTime, endTime, getISODates]);

  useEffect(() => {
    if (step === 2) {
      loadAvailability();

      const channel = supabase
        .channel('reserve-parking-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
          loadAvailability();
        })
        .subscribe();

      const interval = setInterval(loadAvailability, 10000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
      };
    }
  }, [step, loadAvailability]);

  function validateStep1(): string {
    if (!selectedArea) return 'Please select a parking area.';
    const { startISO } = getISODates();
    // Allow up to 5 minutes of leeway for "past" validation so current time doesn't immediately fail
    const leewayNow = new Date(Date.now() - 5 * 60000).toISOString();
    if (startISO < leewayNow) return 'Start time cannot be in the past.';
    
    // We already handled end time being next day in getISODates, so it's always strictly after start time
    // unless they are perfectly equal and we didn't add a day, but our logic adds a day if endTime <= startTime
    return '';
  }

  async function handleConfirmBooking() {
    if (!selectedSlot || !selectedArea || !profile) return;
    const err = validateStep1();
    if (err) { setError(err); return; }

    setBooking(true);
    setError('');
    try {
      const { startISO, endISO } = getISODates();
      const id = await createBooking(
        selectedSlot.id,
        startISO,
        endISO,
        profile.full_name || 'User',
        profile.role || 'student',
        licensePlate || 'N/A'
      );
      setConfirmedBookingId(id);
      setStep(3);
    } catch (e: any) {
      setError(e.message ?? 'Booking failed. The slot may already be taken.');
    } finally {
      setBooking(false);
    }
  }

  const formatDisplay = () => {
    const start = new Date(`${dateStr}T${startTime}`);
    const end = new Date(`${dateStr}T${endTime}`);
    return {
      date: start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: `${start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} – ${end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
    };
  };

  // ---- Step 3: Confirmation ----
  if (step === 3 && confirmedBookingId) {
    const { date, time } = formatDisplay();
    return (
      <>
        <TopBar title="Reservation Complete" subtitle="Your parking spot is secured." />
        <div className="app-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
          <div className="soft-card" style={{ padding: '40px', maxWidth: 800, width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, borderRadius: 32 }}>
            {/* Left: details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                 <div style={{ width: 64, height: 64, borderRadius: 20, background: '#DDF5E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={32} color="#059669" />
                 </div>
                 <div>
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: '#174C3C', margin: 0, letterSpacing: '-0.02em' }}>Booking Confirmed!</h2>
                    <p style={{ fontSize: 14, color: '#627068', margin: '4px 0 0 0' }}>Your spot is ready for you.</p>
                 </div>
              </div>

              {/* Slot badge */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '20px', background: 'linear-gradient(145deg, #174C3C, #0E3329)', borderRadius: 24,
                boxShadow: '0 16px 32px rgba(23,76,60,0.15)'
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: '#C7F36B', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 18, color: '#174C3C',
                  boxShadow: '0 8px 16px rgba(199,243,107,0.2)',
                }}>
                  {selectedSlot?.slot_number}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: '#FFFFFF' }}>Slot {selectedSlot?.slot_number}</div>
                  <div style={{ fontSize: 13, color: '#AABCB4', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} color="#C7F36B" /> {selectedArea?.name}</div>
                </div>
              </div>

              {/* Details */}
              <div style={{ background: '#F8FAF7', borderRadius: 20, padding: 20, border: '1px solid #E3EBE6' }}>
                  {[
                    { label: 'Date', value: date, icon: <Calendar size={14}/> },
                    { label: 'Time', value: time, icon: <Clock size={14}/> },
                    { label: 'Vehicle Plate', value: licensePlate || 'N/A', icon: <Car size={14}/> },
                  ].map(r => (
                    <div key={r.label} style={{
                      display: 'flex', alignItems: 'center',
                      padding: '12px 0', borderBottom: '1px solid #EAEFEA',
                      fontSize: 14,
                    }}>
                      <span style={{ color: '#627068', width: 120, display: 'flex', alignItems: 'center', gap: 8 }}>{r.icon} {r.label}</span>
                      <span style={{ fontWeight: 700, color: '#1A2420' }}>{r.value}</span>
                    </div>
                  ))}
                  <div style={{ padding: '12px 0 0 0', display: 'flex', alignItems: 'center', fontSize: 14 }}>
                      <span style={{ color: '#627068', width: 120 }}>Price</span>
                      <span style={{ fontWeight: 800, color: '#059669', background: '#DDF5E5', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>Free for campus members</span>
                  </div>
              </div>
            </div>

            {/* Right: terms + actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center' }}>
              <div style={{
                background: '#FFFFFF', borderRadius: 20, padding: '24px',
                fontSize: 13, color: '#627068', lineHeight: 1.6, border: '1px solid #E3EBE6',
                boxShadow: '0 8px 24px rgba(23,76,60,0.04)'
              }}>
                <div style={{ fontWeight: 800, color: '#1A2420', marginBottom: 12, fontSize: 15 }}>Campus Parking Guidelines</div>
                <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, margin: 0 }}>
                  <li>Arrive within 15 minutes of selected start time.</li>
                  <li>Have your digital QR pass ready at gate scan.</li>
                  <li>Park strictly within your designated spot boundaries.</li>
                  <li>Release or extend if leaving earlier or later.</li>
                </ul>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0 8px' }}>
                <input type="checkbox" defaultChecked id="terms" style={{ marginTop: 4, width: 16, height: 16, accentColor: '#174C3C' }} />
                <label htmlFor="terms" style={{ fontSize: 13, color: '#627068', lineHeight: 1.5 }}>
                  I confirm that the vehicle details are accurate and agree to university parking policies.
                </label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                <button className="soft-btn-primary" style={{ padding: '16px', fontSize: 15 }} onClick={() => navigate('/bookings', { state: { showQR: confirmedBookingId } })}>
                  View QR Pass →
                </button>
                <button className="btn-secondary" style={{ borderRadius: 14, padding: '14px', justifyContent: 'center', border: 'none', background: '#F8FAF7' }} onClick={() => navigate('/bookings')}>
                  Go to My Bookings
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Reserve Parking" subtitle="Select a date, time and choose an available spot" />
      <div className="app-content" style={{ padding: '36px 40px', maxWidth: 1600, margin: '0 auto' }}>
        
        {/* Visual Stepper */}
        <div className="stepper" style={{ marginBottom: 32, maxWidth: 600 }}>
          {['Details & Timing', 'Select Spot', 'Confirmation'].map((label, i) => {
            const n = (i + 1) as Step;
            const isDone = step > n;
            const isActive = step === n;
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: i < 2 ? 1 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                   <div style={{ 
                       width: 32, height: 32, borderRadius: 12, 
                       background: isActive ? '#174C3C' : isDone ? '#DDF5E5' : '#F0F4F1',
                       color: isActive ? '#C7F36B' : isDone ? '#065F46' : '#9AADA5',
                       fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                       boxShadow: isActive ? '0 8px 16px rgba(23,76,60,0.2)' : 'none',
                       transition: 'all 0.3s ease'
                   }}>
                       {isDone ? '✓' : n}
                   </div>
                   <span style={{ fontSize: 14, fontWeight: isActive ? 700 : 600, color: isActive ? '#1A2420' : '#627068', whiteSpace: 'nowrap' }}>{label}</span>
                </div>
                {i < 2 && <div style={{ flex: 1, height: 2, background: isDone ? '#DDF5E5' : '#E3EBE6', margin: '0 8px', borderRadius: 2 }} />}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 32, alignItems: 'start' }}>
          
          {/* Left: Input Form Panel */}
          <div className="soft-card" style={{ padding: '32px', position: 'sticky', top: 32, borderRadius: 24 }}>
            <h2 style={{ fontWeight: 800, fontSize: 18, color: '#174C3C', marginBottom: 24, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
               <Clock size={20} /> Reservation Details
            </h2>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="ps-label" style={{ fontSize: 12 }}>Date</label>
              <input
                type="date"
                className="soft-input"
                style={{ padding: '14px', borderRadius: 14, background: '#F8FAF7' }}
                value={dateStr}
                min={toLocalInput(new Date())}
                onChange={e => setDateStr(e.target.value)}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="ps-label" style={{ fontSize: 12 }}>Start Time</label>
                  <input type="time" className="soft-input" style={{ padding: '14px', borderRadius: 14, background: '#F8FAF7' }} value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="ps-label" style={{ fontSize: 12 }}>End Time</label>
                  <input type="time" className="soft-input" style={{ padding: '14px', borderRadius: 14, background: '#F8FAF7' }} value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="ps-label" style={{ fontSize: 12 }}>Parking Area</label>
              <select
                className="soft-input"
                value={selectedArea?.id ?? ''}
                onChange={e => {
                  const a = areas.find(x => x.id === e.target.value);
                  if (a) setSelectedArea(a);
                }}
                style={{ padding: '14px', borderRadius: 14, background: '#F8FAF7', cursor: 'pointer' }}
              >
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="ps-label" style={{ fontSize: 12 }}>Vehicle Plate Number</label>
              <input
                type="text"
                className="soft-input"
                style={{ padding: '14px', borderRadius: 14, background: '#F8FAF7' }}
                placeholder="e.g. KA-01-AB-1234"
                value={licensePlate}
                onChange={e => setLicensePlate(e.target.value.toUpperCase())}
              />
            </div>

            {error && (
              <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 20, padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button
              className="soft-btn-primary"
              style={{ padding: '16px', fontSize: 15 }}
              onClick={() => {
                const e = validateStep1();
                if (e) { setError(e); return; }
                setError('');
                setStep(2);
              }}
            >
              Check Availability <ChevronRight size={18} />
            </button>
          </div>

          {/* Right: Immersive Slot Matrix */}
          <div className="soft-card map-container" style={{ 
               padding: 0, overflow: 'hidden', borderRadius: 32, minHeight: 600, display: 'flex', flexDirection: 'column',
               backgroundImage: 'radial-gradient(circle at center, rgba(250, 248, 242, 0.4) 0%, rgba(250, 248, 242, 0.9) 100%), url(/campus-bg.jpg)',
               backgroundSize: 'cover', backgroundPosition: 'center',
               boxShadow: '0 24px 48px rgba(23,76,60,0.08), inset 0 2px 8px rgba(255,255,255,0.9)'
          }}>
            <div style={{ padding: '24px 32px', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(227,235,230,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: 16, color: '#174C3C', margin: 0 }}>Available Spots Matrix</h3>
                <p style={{ fontSize: 13, color: '#627068', marginTop: 4, margin: 0 }}>Select any available green spot to reserve.</p>
              </div>
              <ParkingLegend />
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
                {step === 1 ? (
                  <div className="empty-state" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', borderRadius: 24, padding: 40, border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 12px 32px rgba(23,76,60,0.05)' }}>
                    <MapPin size={32} color="#9AADA5" style={{ marginBottom: 16 }} />
                    <p style={{ fontSize: 14, color: '#627068', fontWeight: 600 }}>Fill in your reservation details and click Check Availability.</p>
                  </div>
                ) : loadingSlots ? (
                  <div className="spinner" />
                ) : slots.length > 0 ? (
                  <div style={{
                      padding: 40, background: 'rgba(255,255,255,0.95)', borderRadius: 32,
                      boxShadow: '0 32px 64px rgba(23,76,60,0.1), 0 4px 16px rgba(0,0,0,0.04), inset 0 2px 4px rgba(255,255,255,1)',
                      backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.6)',
                      transform: 'rotateX(15deg) rotateZ(-1deg) translateY(-5px)', 
                      transformOrigin: 'center', transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotateX(0deg) rotateZ(0deg) translateY(0)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(23,76,60,0.08), inset 0 2px 4px rgba(255,255,255,1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'rotateX(15deg) rotateZ(-1deg) translateY(-5px)'; e.currentTarget.style.boxShadow = '0 32px 64px rgba(23,76,60,0.1), 0 4px 16px rgba(0,0,0,0.04), inset 0 2px 4px rgba(255,255,255,1)'; }}
                  >
                      <ParkingGrid
                        slots={slots}
                        selectedSlotId={selectedSlot?.id}
                        onSlotClick={s => setSelectedSlot(prev => prev?.id === s.id ? null : s)}
                      />
                  </div>
                ) : (
                  <div className="empty-state" style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 24, padding: 40 }}>
                     <Car size={32} color="#9AADA5" style={{ marginBottom: 16 }} />
                     <p style={{ fontSize: 14, color: '#627068' }}>No slots available for the selected time and area.</p>
                  </div>
                )}
            </div>

            {/* Selected slot floating bottom panel */}
            {selectedSlot && step === 2 && (
              <div style={{
                margin: 'auto 32px 32px 32px', padding: '24px 28px',
                border: '1px solid #C7F36B', borderRadius: 24, background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 16px 40px rgba(23,76,60,0.15)',
                display: 'flex', alignItems: 'center', gap: 24
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16, background: '#C7F36B',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 18, color: '#174C3C',
                  boxShadow: '0 8px 16px rgba(199,243,107,0.3)',
                }}>
                  {selectedSlot.slot_number}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#1A2420', marginBottom: 4 }}>Spot Selected</div>
                  <div style={{ fontSize: 13, color: '#627068', fontWeight: 500 }}>{selectedArea?.name} · {selectedSlot.slot_type}</div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                   <div style={{ background: '#F8FAF7', border: '1px solid #E3EBE6', padding: '12px 16px', borderRadius: 12, textAlign: 'center' }}>
                       <div style={{ fontSize: 11, color: '#9AADA5', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Walking</div>
                       <div style={{ fontSize: 13, fontWeight: 700, color: '#1A2420', marginTop: 2 }}>2 min</div>
                   </div>
                   <button
                     className="soft-btn-primary"
                     style={{ padding: '0 24px', fontSize: 15, borderRadius: 12 }}
                     onClick={handleConfirmBooking}
                     disabled={booking}
                   >
                     {booking ? 'Reserving...' : 'Confirm Booking →'}
                   </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
