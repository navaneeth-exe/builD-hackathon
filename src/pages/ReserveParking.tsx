import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import TopBar from '../components/TopBar';
import ParkingGrid, { ParkingLegend } from '../components/ParkingGrid';
import StatusBadge from '../components/StatusBadge';
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

  const loadAvailability = useCallback(async () => {
    if (!selectedArea || !dateStr || !startTime || !endTime) return;
    const startISO = buildISO(dateStr, startTime);
    const endISO = buildISO(dateStr, endTime);
    if (endISO <= startISO) return;

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
  }, [selectedArea, dateStr, startTime, endTime]);

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
    const startISO = buildISO(dateStr, startTime);
    const endISO = buildISO(dateStr, endTime);
    if (startISO < new Date().toISOString()) return 'Start time cannot be in the past.';
    if (endISO <= startISO) return 'End time must be after start time.';
    return '';
  }

  async function handleConfirmBooking() {
    if (!selectedSlot || !selectedArea || !profile) return;
    const err = validateStep1();
    if (err) { setError(err); return; }

    setBooking(true);
    setError('');
    try {
      const startISO = buildISO(dateStr, startTime);
      const endISO = buildISO(dateStr, endTime);
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
        <TopBar title="Booking Confirmation" subtitle="Review your booking details and confirm" />
        <div className="app-content" style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="ps-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Left: details */}
            <div>
              {/* Slot badge */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
                padding: '12px 14px', background: '#F7FBF8', border: '1px solid #E5EAE4', borderRadius: 10,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: '#DDF5E5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13, color: '#065F46',
                }}>
                  {selectedSlot?.slot_number}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{selectedSlot?.slot_number}</div>
                  <div style={{ fontSize: 12, color: '#68736B' }}>{selectedArea?.name}</div>
                </div>
                <StatusBadge status="CONFIRMED" />
              </div>

              {/* Details */}
              {[
                { label: 'Date', value: date },
                { label: 'Time', value: time },
                { label: 'Parking Area', value: selectedArea?.name },
                { label: 'Slot Type', value: selectedSlot?.slot_type },
                { label: 'Price', value: 'Free for students' },
              ].map(r => (
                <div key={r.label} style={{
                  display: 'flex', alignItems: 'center',
                  padding: '9px 0', borderBottom: '1px solid #F0F2EF',
                  fontSize: 13,
                }}>
                  <span style={{ color: '#68736B', width: 110 }}>{r.label}</span>
                  <span style={{ fontWeight: 500 }}>{r.value}</span>
                </div>
              ))}
            </div>

            {/* Right: terms + actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                background: '#F7F8F4', borderRadius: 8, padding: '14px',
                fontSize: 12.5, color: '#68736B', lineHeight: 1.6,
              }}>
                <div style={{ fontWeight: 600, color: '#202923', marginBottom: 6 }}>Parking Rules</div>
                <ul style={{ paddingLeft: 16 }}>
                  <li>Arrive within 15 minutes of start time.</li>
                  <li>Keep your QR pass available at entry.</li>
                  <li>Do not park in other spots.</li>
                  <li>Extend or cancel before the time expires.</li>
                </ul>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 4 }}>
                <input type="checkbox" defaultChecked id="terms" style={{ marginTop: 2 }} />
                <label htmlFor="terms" style={{ fontSize: 12.5, color: '#68736B' }}>
                  I agree to the campus parking rules and terms of use.
                </label>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <button className="btn-secondary" onClick={() => navigate('/bookings')}>
                  My Bookings
                </button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={() => navigate('/bookings', { state: { showQR: confirmedBookingId } })}>
                  View QR Pass →
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const step1Err = step === 2 ? validateStep1() : '';
  if (step1Err) { /* ignore or use */ }

  return (
    <>
      <TopBar title="Reserve Parking" subtitle="Select a date, time and choose an available slot" />
      <div className="app-content">
        {/* Stepper */}
        <div className="stepper" style={{ marginBottom: 24, maxWidth: 420 }}>
          {['Select Time', 'Choose Slot', 'Confirm Booking'].map((label, i) => {
            const n = (i + 1) as Step;
            const isDone = step > n;
            const isActive = step === n;
            return (
              <>
                <div key={n} className={`stepper-step${isActive ? ' active' : isDone ? ' done' : ''}`}>
                  <div className="step-num">{isDone ? '✓' : n}</div>
                  <span>{label}</span>
                </div>
                {i < 2 && <div className="step-divider" key={`d${i}`} />}
              </>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>
          {/* Left: date/time/area */}
          <div className="ps-card" style={{ position: 'sticky', top: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>1. Select Date & Time</div>

            <div className="form-group">
              <label className="ps-label">Date</label>
              <input
                type="date"
                className="ps-input"
                value={dateStr}
                min={toLocalInput(new Date())}
                onChange={e => setDateStr(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="ps-label">Start Time</label>
              <input type="time" className="ps-input" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="ps-label">End Time</label>
              <input type="time" className="ps-input" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="ps-label">Parking Area</label>
              <select
                className="ps-input"
                value={selectedArea?.id ?? ''}
                onChange={e => {
                  const a = areas.find(x => x.id === e.target.value);
                  if (a) setSelectedArea(a);
                }}
              >
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="ps-label">Vehicle Plate (optional)</label>
              <input
                type="text"
                className="ps-input"
                placeholder="e.g. KA-01-AB-1234"
                value={licensePlate}
                onChange={e => setLicensePlate(e.target.value.toUpperCase())}
              />
            </div>

            {error && (
              <div style={{ color: '#B91C1C', fontSize: 12.5, marginBottom: 12, padding: '8px 10px', background: '#FCE2E2', borderRadius: 6 }}>
                {error}
              </div>
            )}

            <button
              className="btn-primary"
              style={{ width: '100%' }}
              onClick={() => {
                const e = validateStep1();
                if (e) { setError(e); return; }
                setError('');
                setStep(2);
              }}
            >
              Check Availability <ChevronRight size={14} />
            </button>
          </div>

          {/* Right: slot grid */}
          <div className="ps-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>2. Choose an Available Slot</span>
              <ParkingLegend />
            </div>

            {step === 1 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <p style={{ fontSize: 13, color: '#9CA3AF' }}>Select date, time and area, then check availability.</p>
              </div>
            ) : loadingSlots ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                <div className="spinner" />
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                  <ParkingGrid
                    slots={slots}
                    selectedSlotId={selectedSlot?.id}
                    onSlotClick={s => setSelectedSlot(prev => prev?.id === s.id ? null : s)}
                  />
                </div>

                {/* Selected slot details */}
                {selectedSlot ? (
                  <div style={{
                    marginTop: 12, padding: '14px',
                    border: '1px solid #C7F36B', borderRadius: 10, background: '#F7FBF8',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#68736B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                      Selected Slot
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 8, background: '#C7F36B',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 14, color: '#174C3C',
                      }}>
                        {selectedSlot.slot_number}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{selectedSlot.slot_number}</div>
                        <div style={{ fontSize: 12, color: '#68736B' }}>{selectedArea?.name}</div>
                      </div>
                      <StatusBadge status="AVAILABLE" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                      {[
                        { label: 'Standard Slot', sub: selectedSlot.slot_type },
                        { label: 'Near Entrance', sub: '2 min walk' },
                        { label: 'Covered', sub: 'Yes' },
                      ].map(it => (
                        <div key={it.label} style={{ fontSize: 11, color: '#68736B', textAlign: 'center' }}>
                          <div style={{ fontWeight: 600, color: '#202923', fontSize: 12 }}>{it.label}</div>
                          <div>{it.sub}</div>
                        </div>
                      ))}
                    </div>
                    <button
                      className="btn-primary"
                      style={{ width: '100%' }}
                      onClick={handleConfirmBooking}
                      disabled={booking}
                    >
                      {booking ? 'Booking…' : 'Proceed to Confirm →'}
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: 12 }}>
                    Click a green slot to select it.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
