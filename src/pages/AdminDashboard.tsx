import { useState, useEffect, useCallback } from 'react';
import { ParkingSquare, Plus, Search, X } from 'lucide-react';
import TopBar from '../components/TopBar';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import {
  fetchAllBookings, fetchAllSlots, fetchParkingAreas, addParkingSlot, toggleSlotActive,
  fetchDashboardStats, updateBookingStatus,
} from '../api';
import type { Booking, ParkingSlot, ParkingArea, DashboardStats } from '../types';
import { formatDate, formatTime } from '../api';

type AdminTab = 'overview' | 'slots' | 'reservations' | 'scan';

export default function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<DashboardStats>({ total: 0, available: 0, reserved: 0, occupied: 0 });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [areas, setAreas] = useState<ParkingArea[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [, setLoading] = useState(true);

  // Add slot modal state
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newSlotArea, setNewSlotArea] = useState('');
  const [newSlotNumber, setNewSlotNumber] = useState('');
  const [newSlotType, setNewSlotType] = useState('Car');
  const [addingSlot, setAddingSlot] = useState(false);
  const [addSlotError, setAddSlotError] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [b, s, a, st] = await Promise.all([
        fetchAllBookings({ status: statusFilter as any || undefined, search }),
        fetchAllSlots(),
        fetchParkingAreas(),
        fetchDashboardStats(),
      ]);
      setBookings(b);
      setSlots(s);
      setAreas(a);
      setStats(st);
      if (!newSlotArea && a.length > 0) setNewSlotArea(a[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleAddSlot() {
    if (!newSlotNumber.trim()) { setAddSlotError('Slot number is required.'); return; }
    setAddingSlot(true);
    setAddSlotError('');
    try {
      await addParkingSlot(newSlotArea, newSlotNumber.trim().toUpperCase(), newSlotType);
      setShowAddSlot(false);
      setNewSlotNumber('');
      await loadAll();
    } catch (e: any) {
      setAddSlotError(e.message ?? 'Failed to add slot.');
    } finally {
      setAddingSlot(false);
    }
  }

  async function handleToggleSlot(slot: ParkingSlot) {
    if (!slot.is_active) {
      await toggleSlotActive(slot.id, true);
    } else {
      // Check for active bookings
      const active = bookings.filter(b =>
        b.slot_id === slot.id && ['CONFIRMED', 'CHECKED_IN'].includes(b.status)
      );
      if (active.length > 0) {
        alert(`Cannot disable slot ${slot.slot_number}: it has ${active.length} active reservation(s). Cancel them first.`);
        return;
      }
      if (!confirm(`Disable slot ${slot.slot_number}? It will no longer accept new bookings.`)) return;
      await toggleSlotActive(slot.id, false);
    }
    await loadAll();
  }

  const TABS: { id: AdminTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'slots', label: 'Parking Slots' },
    { id: 'reservations', label: 'Reservations' },
    { id: 'scan', label: 'Scan QR' },
  ];

  return (
    <>
      <TopBar title="Admin Dashboard" subtitle="Manage parking slots and reservations" />

      {/* Add Slot Modal */}
      {showAddSlot && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Add Parking Slot</span>
              <button onClick={() => setShowAddSlot(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#68736B' }}>
                <X size={16} />
              </button>
            </div>

            <div className="form-group">
              <label className="ps-label">Parking Area</label>
              <select className="ps-input" value={newSlotArea} onChange={e => setNewSlotArea(e.target.value)}>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="ps-label">Slot Number (e.g. A-15)</label>
              <input className="ps-input" placeholder="A-15" value={newSlotNumber} onChange={e => setNewSlotNumber(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="ps-label">Slot Type</label>
              <select className="ps-input" value={newSlotType} onChange={e => setNewSlotType(e.target.value)}>
                <option>Car</option>
                <option>Bike</option>
                <option>EV</option>
              </select>
            </div>

            {addSlotError && <div style={{ color: '#B91C1C', fontSize: 12.5, marginBottom: 10 }}>{addSlotError}</div>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddSlot(false)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleAddSlot} disabled={addingSlot}>
                {addingSlot ? 'Adding…' : 'Add Slot'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="app-content" style={{ display: 'flex', gap: 0, padding: 0, height: '100%', overflow: 'hidden' }}>
        {/* Admin sidebar */}
        <div className="admin-sidebar">
          {TABS.map(t => (
            <div
              key={t.id}
              className={`admin-nav-item${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </div>
          ))}
        </div>

        {/* Admin content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

          {/* Overview */}
          {tab === 'overview' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                <StatCard label="Total Slots" value={stats.total} icon={<ParkingSquare size={18} />} accent="#E8F4EF" iconColor="#174C3C" />
                <StatCard label="Available" value={stats.available} icon={<span style={{ fontWeight: 700 }}>✓</span>} accent="#DDF5E5" iconColor="#065F46" />
                <StatCard label="Reserved" value={stats.reserved} icon={<span style={{ fontWeight: 700 }}>⏱</span>} accent="#FEF0C7" iconColor="#92400E" />
                <StatCard label="Occupied" value={stats.occupied} icon={<span style={{ fontWeight: 700 }}>🚗</span>} accent="#FCE2E2" iconColor="#B91C1C" />
              </div>

              {/* Recent reservations */}
              <div className="ps-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5EAE4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Recent Reservations</span>
                  <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setTab('reservations')}>
                    View All
                  </button>
                </div>
                <table className="ps-table">
                  <thead>
                    <tr>
                      <th>Slot</th>
                      <th>User</th>
                      <th>Date & Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.slice(0, 6).map(b => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 600 }}>{b.parking_slots?.slot_number}</td>
                        <td>{b.user_name}</td>
                        <td style={{ color: '#68736B' }}>
                          {formatDate(b.start_time)}, {formatTime(b.start_time)} – {formatTime(b.end_time)}
                        </td>
                        <td><StatusBadge status={b.status} small /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {bookings.length === 0 && (
                  <div className="empty-state"><p>No reservations yet.</p></div>
                )}
              </div>

              {/* Quick actions */}
              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <button className="btn-primary" onClick={() => { setShowAddSlot(true); setTab('slots'); }}>
                  <Plus size={14} /> Add Parking Slot
                </button>
                <button className="btn-secondary" onClick={() => setTab('slots')}>
                  Manage Slots
                </button>
                <button className="btn-secondary" onClick={() => setTab('reservations')}>
                  View Reservations
                </button>
                <button className="btn-secondary" onClick={() => setTab('scan')}>
                  Scan QR
                </button>
              </div>
            </div>
          )}

          {/* Slots management */}
          {tab === 'slots' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Parking Slots</span>
                <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setShowAddSlot(true)}>
                  <Plus size={14} /> Add Slot
                </button>
              </div>

              <div className="ps-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="ps-table">
                  <thead>
                    <tr>
                      <th>Slot</th>
                      <th>Area</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>{s.slot_number}</td>
                        <td style={{ color: '#68736B' }}>{(s as any).parking_areas?.name}</td>
                        <td>{s.slot_type}</td>
                        <td>
                          <StatusBadge status={s.is_active ? 'AVAILABLE' : 'UNAVAILABLE'} small />
                        </td>
                        <td>
                          <button
                            style={{
                              padding: '4px 10px', borderRadius: 6, border: '1px solid #E5EAE4',
                              background: 'none', cursor: 'pointer', fontSize: 12,
                              color: s.is_active ? '#B91C1C' : '#065F46',
                            }}
                            onClick={() => handleToggleSlot(s as any)}
                          >
                            {s.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {slots.length === 0 && (
                  <div className="empty-state"><p>No slots configured yet.</p></div>
                )}
              </div>
            </div>
          )}

          {/* Reservations */}
          {tab === 'reservations' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>All Reservations</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                    <input
                      className="ps-input"
                      placeholder="Search…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{ paddingLeft: 30, width: 200 }}
                    />
                  </div>
                  <select className="ps-input" style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="CHECKED_IN">Checked In</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="ps-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="ps-table">
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>Slot</th>
                      <th>User</th>
                      <th>Date & Time</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{b.booking_code}</td>
                        <td style={{ fontWeight: 600 }}>{b.parking_slots?.slot_number}</td>
                        <td>{b.user_name}</td>
                        <td style={{ color: '#68736B', fontSize: 12 }}>
                          {formatDate(b.start_time)}, {formatTime(b.start_time)}–{formatTime(b.end_time)}
                        </td>
                        <td><StatusBadge status={b.status} small /></td>
                        <td>
                          {b.status === 'CONFIRMED' && (
                            <button
                              style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid #FECACA', background: 'none', cursor: 'pointer', fontSize: 11.5, color: '#B91C1C' }}
                              onClick={async () => {
                                if (!confirm('Cancel this booking?')) return;
                                await updateBookingStatus(b.id, 'CANCELLED');
                                await loadAll();
                              }}
                            >Cancel</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {bookings.length === 0 && (
                  <div className="empty-state"><p>No bookings match your filter.</p></div>
                )}
              </div>
            </div>
          )}

          {/* Scan QR — embed scan page inline */}
          {tab === 'scan' && (
            <div>
              <div style={{ marginBottom: 16, fontWeight: 700, fontSize: 15 }}>Scan QR / Validate Booking</div>
              <InlineScan />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Inline lightweight scan for admin
function InlineScan() {
  const [code, setCode] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function validate() {
    if (!code.trim()) { setError('Enter a booking ID.'); return; }
    setLoading(true); setError(''); setBooking(null); setMsg('');
    try {
      const b = await (await import('../api')).fetchBookingByCode(code.trim());
      if (b.status === 'CANCELLED') throw new Error('Booking is cancelled.');
      if (b.status === 'COMPLETED') throw new Error('Booking is already completed.');
      setBooking(b);
    } catch (e: any) {
      setError(e.message?.includes('PGRST116') ? 'No booking found.' : e.message ?? 'Error');
    } finally { setLoading(false); }
  }

  async function checkin() {
    if (!booking || booking.status !== 'CONFIRMED') return;
    try {
      await updateBookingStatus(booking.id, 'CHECKED_IN');
      setMsg('✅ Checked in!'); setBooking({ ...booking, status: 'CHECKED_IN' });
    } catch (e: any) { setError(e.message ?? 'Failed'); }
  }

  async function checkout() {
    if (!booking || booking.status !== 'CHECKED_IN') return;
    try {
      await updateBookingStatus(booking.id, 'COMPLETED');
      setMsg('✅ Checked out!'); setBooking({ ...booking, status: 'COMPLETED' });
    } catch (e: any) { setError(e.message ?? 'Failed'); }
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div className="ps-card" style={{ marginBottom: 12 }}>
        <label className="ps-label">Booking ID</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="ps-input" placeholder="PS-20241021-001" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && validate()} />
          <button className="btn-primary" onClick={validate} disabled={loading}>{loading ? '…' : 'Validate'}</button>
        </div>
      </div>

      {error && <div style={{ color: '#B91C1C', fontSize: 13, padding: '10px 14px', background: '#FCE2E2', borderRadius: 8, marginBottom: 10 }}>{error}</div>}
      {msg && <div style={{ color: '#065F46', fontSize: 13, padding: '10px 14px', background: '#DDF5E5', borderRadius: 8, marginBottom: 10 }}>{msg}</div>}

      {booking && (
        <div className="ps-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontWeight: 700 }}>Booking: {booking.booking_code}</span>
            <StatusBadge status={booking.status} />
          </div>
          <div style={{ fontSize: 13, color: '#68736B', marginBottom: 14 }}>
            {booking.parking_slots?.slot_number} · {booking.parking_slots?.parking_areas?.name}<br />
            {formatDate(booking.start_time)}, {formatTime(booking.start_time)}–{formatTime(booking.end_time)}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" disabled={booking.status !== 'CONFIRMED'} onClick={checkin}>Check In</button>
            <button className="btn-secondary" disabled={booking.status !== 'CHECKED_IN'} onClick={checkout}>Check Out</button>
          </div>
        </div>
      )}
    </div>
  );
}
