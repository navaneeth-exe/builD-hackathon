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
        <div className="app-content" style={{ maxWidth: 740, margin: '0 auto' }}>
          <div className="soft-card" style={{ padding: '28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            {/* Left: details */}
            <div>
              {/* Slot badge */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20,
                padding: '14px 16px', background: '#F7FBF8', border: '1px solid #E2EAE4', borderRadius: 14,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: '#DDF5E5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 14, color: '#065F46',
                  boxShadow: '0 4px 10px rgba(6, 95, 70, 0.1)',
                }}>
                  {selectedSlot?.slot_number}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#174C3C' }}>Slot {selectedSlot?.slot_number}</div>
                  <div style={{ fontSize: 12, color: '#68736B' }}>{selectedArea?.name}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <StatusBadge status="CONFIRMED" />
                </div>
              </div>

              {/* Details */}
              {[
                { label: 'Date', value: date },
                { label: 'Time', value: time },
                { label: 'Parking Area', value: selectedArea?.name },
                { label: 'Slot Type', value: selectedSlot?.slot_type },
                { label: 'Vehicle Plate', value: licensePlate || 'N/A' },
                { label: 'Price', value: 'Free for campus members' },
              ].map(r => (
                <div key={r.label} style={{
                  display: 'flex', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid #F0F4F1',
                  fontSize: 13,
                }}>
                  <span style={{ color: '#68736B', width: 110 }}>{r.label}</span>
                  <span style={{ fontWeight: 600, color: '#202923' }}>{r.value}</span>
                </div>
              ))}
            </div>

            {/* Right: terms + actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                background: '#F8FAF8', borderRadius: 14, padding: '16px',
                fontSize: 12.5, color: '#68736B', lineHeight: 1.6, border: '1px solid #E5ECE6',
              }}>
                <div style={{ fontWeight: 700, color: '#174C3C', marginBottom: 8 }}>Campus Parking Guidelines</div>
                <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li>Arrive within 15 minutes of selected start time.</li>
                  <li>Have your digital QR pass ready at gate scan.</li>
                  <li>Park strictly within your designated spot boundaries.</li>
                  <li>Release or extend if leaving earlier or later.</li>
                </ul>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 4 }}>
                <input type="checkbox" defaultChecked id="terms" style={{ marginTop: 3, accentColor: '#174C3C' }} />
                <label htmlFor="terms" style={{ fontSize: 12, color: '#68736B', lineHeight: 1.4 }}>
                  I confirm that the vehicle details are accurate and agree to university parking policies.
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 8 }}>
                <button className="btn-secondary" style={{ borderRadius: 12, padding: '12px 16px' }} onClick={() => navigate('/bookings')}>
                  My Bookings
                </button>
                <button className="soft-btn-primary" style={{ flex: 1 }} onClick={() => navigate('/bookings', { state: { showQR: confirmedBookingId } })}>
                  View QR Pass →
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
      <TopBar title="Reserve Parking" subtitle="Select a date, time and choose an available slot" />
      <div className="app-content">
        {/* Stepper */}
        <div className="stepper" style={{ marginBottom: 22, maxWidth: 440 }}>
          {['Select Time', 'Choose Slot', 'Confirm Booking'].map((label, i) => {
            const n = (i + 1) as Step;
            const isDone = step > n;
            const isActive = step === n;
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className={`stepper-step${isActive ? ' active' : isDone ? ' done' : ''}`}>
                  <div className="step-num">{isDone ? '✓' : n}</div>
                  <span>{label}</span>
                </div>
                {i < 2 && <div className="step-divider" />}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: 18, alignItems: 'start' }}>
          {/* Left: date/time/area */}
          <div className="soft-card" style={{ padding: '22px', position: 'sticky', top: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#174C3C', marginBottom: 16 }}>1. Reservation Details</div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="ps-label">Date</label>
              <input
                type="date"
                className="soft-input"
                value={dateStr}
                min={toLocalInput(new Date())}
                onChange={e => setDateStr(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="ps-label">Start Time</label>
              <input type="time" className="soft-input" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="ps-label">End Time</label>
              <input type="time" className="soft-input" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="ps-label">Parking Area</label>
              <select
                className="soft-input"
                value={selectedArea?.id ?? ''}
                onChange={e => {
                  const a = areas.find(x => x.id === e.target.value);
                  if (a) setSelectedArea(a);
                }}
                style={{ cursor: 'pointer' }}
              >
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="ps-label">Vehicle Plate</label>
              <input
                type="text"
                className="soft-input"
                placeholder="e.g. KA-01-AB-1234"
                value={licensePlate}
                onChange={e => setLicensePlate(e.target.value.toUpperCase())}
              />
            </div>

            {error && (
              <div style={{ color: '#B91C1C', fontSize: 12.5, marginBottom: 14, padding: '10px 12px', background: '#FCE2E2', border: '1px solid #FECACA', borderRadius: 10 }}>
                {error}
              </div>
            )}

            <button
              className="soft-btn-primary"
              onClick={() => {
                const e = validateStep1();
                if (e) { setError(e); return; }
                setError('');
                setStep(2);
              }}
            >
              Check Availability <ChevronRight size={15} />
            </button>
          </div>

          {/* Right: slot grid */}
          <div className="soft-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <span style={{ fontWeight: 800, fontSize: 15, color: '#174C3C' }}>2. Available Slot Matrix</span>
                <p style={{ fontSize: 12, color: '#68736B', marginTop: 2 }}>Select any green slot to reserve your spot</p>
              </div>
              <ParkingLegend />
            </div>

            {step === 1 ? (
              <div className="empty-state" style={{ padding: 48, background: '#F9FBF9', borderRadius: 14, border: '1px dashed #D5DDD6' }}>
                <p style={{ fontSize: 13, color: '#68736B' }}>Select date, time and parking area on the left, then click Check Availability.</p>
              </div>
            ) : loadingSlots ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 56 }}>
                <div className="spinner" />
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto', marginBottom: 18, padding: '12px 6px', background: '#F8FAF8', borderRadius: 14, border: '1px solid #EAEFEA' }}>
                  <ParkingGrid
                    slots={slots}
                    selectedSlotId={selectedSlot?.id}
                    onSlotClick={s => setSelectedSlot(prev => prev?.id === s.id ? null : s)}
                  />
                </div>

                {/* Selected slot details */}
                {selectedSlot ? (
                  <div style={{
                    marginTop: 14, padding: '18px 20px',
                    border: '1.5px solid #C7F36B', borderRadius: 16, background: '#F7FBF8',
                    boxShadow: '0 6px 16px rgba(23,76,60,0.06)',
                  }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#174C3C', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                      Selected Slot Details
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: 12, background: '#C7F36B',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 15, color: '#174C3C',
                        boxShadow: '0 4px 10px rgba(199,243,107,0.4)',
                      }}>
                        {selectedSlot.slot_number}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#174C3C' }}>Slot {selectedSlot.slot_number}</div>
                        <div style={{ fontSize: 12, color: '#68736B' }}>{selectedArea?.name} · {selectedSlot.slot_type}</div>
                      </div>
                      <div style={{ marginLeft: 'auto' }}>
                        <StatusBadge status="AVAILABLE" />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16, background: '#FFFFFF', padding: '10px 14px', borderRadius: 12, border: '1px solid #E5ECE6' }}>
                      {[
                        { label: 'Slot Type', sub: selectedSlot.slot_type },
                        { label: 'Walking Distance', sub: '2 min walk' },
                        { label: 'Facility', sub: 'Covered Bay' },
                      ].map(it => (
                        <div key={it.label} style={{ fontSize: 11, color: '#68736B', textAlign: 'center' }}>
                          <div style={{ fontWeight: 700, color: '#202923', fontSize: 12 }}>{it.sub}</div>
                          <div>{it.label}</div>
                        </div>
                      ))}
                    </div>

                    <button
                      className="soft-btn-primary"
                      onClick={handleConfirmBooking}
                      disabled={booking}
                    >
                      {booking ? 'Reserving Spot…' : 'Proceed to Confirm Booking →'}
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: '#68736B', textAlign: 'center', padding: 14, background: '#F8FAF8', borderRadius: 12 }}>
                    Click on an available green slot in the grid above to continue.
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

