import { useState, useEffect, useCallback } from 'react';
import { ParkingSquare, Plus, Search, X, CheckCircle, Clock, ShieldCheck, Database, QrCode } from 'lucide-react';
import TopBar from '../components/TopBar';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import {
  fetchAllBookings, fetchAllSlots, fetchParkingAreas, addParkingSlot, toggleSlotActive,
  fetchDashboardStats, updateBookingStatus,
} from '../api';
import { supabase } from '../lib/supabase';
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

  useEffect(() => {
    loadAll();

    const channel = supabase
      .channel('admin-dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
        loadAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slots' }, () => {
        loadAll();
      })
      .subscribe();

    const interval = setInterval(loadAll, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [loadAll]);

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

  const TABS: { id: AdminTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: <ParkingSquare size={18} /> },
    { id: 'slots', label: 'Manage Slots', icon: <Database size={18} /> },
    { id: 'reservations', label: 'Reservations', icon: <Clock size={18} /> },
    { id: 'scan', label: 'Scan QR Pass', icon: <QrCode size={18} /> },
  ];

  return (
    <>
      <TopBar title="Admin Dashboard" subtitle="Manage campus parking slots and system data" />

      {/* Add Slot Modal */}
      {showAddSlot && (
        <div className="modal-backdrop" style={{ background: 'rgba(11,21,16,0.6)', backdropFilter: 'blur(8px)' }}>
          <div className="modal-box soft-card" style={{ padding: '32px', maxWidth: 440, borderRadius: 28, boxShadow: '0 32px 64px rgba(23,76,60,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <span style={{ fontWeight: 800, fontSize: 20, color: '#1A2420', letterSpacing: '-0.02em' }}>Add Parking Slot</span>
              <button onClick={() => setShowAddSlot(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9AADA5', padding: 8 }}>
                <X size={20} />
              </button>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="ps-label">Parking Area</label>
              <select className="soft-input" style={{ borderRadius: 16 }} value={newSlotArea} onChange={e => setNewSlotArea(e.target.value)}>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="ps-label">Slot Number</label>
              <input className="soft-input" style={{ borderRadius: 16 }} placeholder="e.g. A-15" value={newSlotNumber} onChange={e => setNewSlotNumber(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="ps-label">Slot Type</label>
              <select className="soft-input" style={{ borderRadius: 16 }} value={newSlotType} onChange={e => setNewSlotType(e.target.value)}>
                <option>Car</option>
                <option>Bike</option>
                <option>EV</option>
              </select>
            </div>

            {addSlotError && (
              <div style={{ color: '#991B1B', fontSize: 13, marginBottom: 20, padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                 <X size={16} /> {addSlotError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-secondary" style={{ flex: 1, borderRadius: 16, padding: '14px' }} onClick={() => setShowAddSlot(false)}>Cancel</button>
              <button className="soft-btn-primary" style={{ flex: 1, borderRadius: 16, padding: '14px', justifyContent: 'center' }} onClick={handleAddSlot} disabled={addingSlot}>
                {addingSlot ? 'Adding…' : 'Add Slot'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="app-content" style={{ display: 'flex', gap: 24, padding: '24px 32px', height: 'calc(100vh - 70px)', maxWidth: 1400, margin: '0 auto' }}>
        {/* Admin sidebar */}
        <div className="soft-card" style={{ width: 260, padding: '16px', borderRadius: 28, display: 'flex', flexDirection: 'column', gap: 8, background: '#FFFFFF', alignSelf: 'flex-start' }}>
          <div style={{ padding: '12px 16px', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#9AADA5', textTransform: 'uppercase', letterSpacing: '0.08em' }}>System Admin</div>
          </div>
          {TABS.map(t => (
            <div
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                 padding: '14px 16px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                 background: tab === t.id ? '#174C3C' : 'transparent',
                 color: tab === t.id ? '#FFFFFF' : '#627068',
                 fontWeight: tab === t.id ? 700 : 600,
                 transition: 'all 0.2s',
              }}
              onMouseOver={e => { if (tab !== t.id) { e.currentTarget.style.background = '#F8FAF7'; e.currentTarget.style.color = '#1A2420'; } }}
              onMouseOut={e => { if (tab !== t.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#627068'; } }}
            >
              <div style={{ color: tab === t.id ? '#C7F36B' : 'inherit' }}>{t.icon}</div>
              {t.label}
            </div>
          ))}
        </div>

        {/* Admin content */}
        <div style={{ flex: 1, overflow: 'auto', paddingRight: 12, paddingBottom: 40 }}>

          {/* Overview */}
          {tab === 'overview' && (
            <div style={{ animation: 'fade-in 0.3s ease-out' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                
                <div className="soft-card" style={{ padding: '24px', borderRadius: 24, background: 'linear-gradient(135deg, #174C3C 0%, #0B2920 100%)', color: '#FFFFFF', boxShadow: '0 16px 32px rgba(23,76,60,0.15)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(199,243,107,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '1px solid rgba(199,243,107,0.2)' }}>
                    <ParkingSquare size={20} color="#C7F36B" />
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>{stats.total}</div>
                  <div style={{ fontSize: 13, color: '#A7C9BE', marginTop: 8, fontWeight: 600 }}>Total Campus Slots</div>
                </div>

                <div className="soft-card" style={{ padding: '24px', borderRadius: 24, background: '#FFFFFF', border: '1px solid #DDF5E5', boxShadow: '0 12px 24px rgba(6,95,70,0.06)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#DDF5E5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <CheckCircle size={20} color="#059669" />
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#059669', lineHeight: 1 }}>{stats.available}</div>
                  <div style={{ fontSize: 13, color: '#065F46', marginTop: 8, fontWeight: 600 }}>Available Slots</div>
                </div>

                <div className="soft-card" style={{ padding: '24px', borderRadius: 24, background: '#FFFFFF', border: '1px solid #FEF0C7', boxShadow: '0 12px 24px rgba(146,64,14,0.06)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEF0C7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Clock size={20} color="#B45309" />
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#B45309', lineHeight: 1 }}>{stats.reserved}</div>
                  <div style={{ fontSize: 13, color: '#92400E', marginTop: 8, fontWeight: 600 }}>Reserved</div>
                </div>

                <div className="soft-card" style={{ padding: '24px', borderRadius: 24, background: '#FFFFFF', border: '1px solid #FEE2E2', boxShadow: '0 12px 24px rgba(220,38,38,0.06)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <QrCode size={20} color="#DC2626" />
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#DC2626', lineHeight: 1 }}>{stats.occupied}</div>
                  <div style={{ fontSize: 13, color: '#991B1B', marginTop: 8, fontWeight: 600 }}>Occupied</div>
                </div>

              </div>

              {/* Quick actions */}
              <div className="soft-card" style={{ padding: '24px', borderRadius: 24, background: '#FFFFFF', marginBottom: 24, display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, paddingRight: 24, borderRight: '1px solid #EAEFEA' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1A2420', marginBottom: 6 }}>Manage Infrastructure</div>
                  <div style={{ fontSize: 12, color: '#627068', marginBottom: 16 }}>Add or modify parking slots across all zones.</div>
                  <button className="soft-btn-primary" style={{ width: '100%', borderRadius: 14, padding: '12px', justifyContent: 'center' }} onClick={() => { setShowAddSlot(true); setTab('slots'); }}>
                    <Plus size={16} /> Add Parking Slot
                  </button>
                </div>
                <div style={{ flex: 1, padding: '0 24px', borderRight: '1px solid #EAEFEA' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1A2420', marginBottom: 6 }}>View Reservations</div>
                  <div style={{ fontSize: 12, color: '#627068', marginBottom: 16 }}>Search, filter, or cancel active bookings.</div>
                  <button className="btn-secondary" style={{ width: '100%', borderRadius: 14, padding: '12px', justifyContent: 'center' }} onClick={() => setTab('reservations')}>
                    Open Reservations
                  </button>
                </div>
                <div style={{ flex: 1, paddingLeft: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1A2420', marginBottom: 6 }}>Manual Validation</div>
                  <div style={{ fontSize: 12, color: '#627068', marginBottom: 16 }}>Override and validate passes manually.</div>
                  <button className="btn-secondary" style={{ width: '100%', borderRadius: 14, padding: '12px', justifyContent: 'center' }} onClick={() => setTab('scan')}>
                    Scan QR Pass
                  </button>
                </div>
              </div>

              {/* Recent reservations */}
              <div className="soft-card" style={{ padding: '24px', borderRadius: 28, background: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <span style={{ fontWeight: 800, fontSize: 18, color: '#1A2420', letterSpacing: '-0.01em' }}>Recent Reservations</span>
                  <button className="btn-secondary" style={{ fontSize: 12, padding: '8px 16px', borderRadius: 12, fontWeight: 700 }} onClick={() => setTab('reservations')}>
                    View All
                  </button>
                </div>
                
                {bookings.length === 0 ? (
                  <div style={{ padding: '48px 0', textAlign: 'center' }}>
                     <div style={{ width: 48, height: 48, borderRadius: 16, background: '#F8FAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px dashed #D5DDD6' }}>
                        <Clock size={20} color="#9AADA5" />
                     </div>
                     <div style={{ fontSize: 14, fontWeight: 700, color: '#627068' }}>No reservations found.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {bookings.slice(0, 6).map(b => (
                      <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: '#F8FAF7', borderRadius: 16, border: '1px solid #EAEFEA' }}>
                         <div style={{ width: 40, height: 40, borderRadius: 12, background: '#E3EBE6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <span style={{ fontSize: 14, fontWeight: 800, color: '#174C3C' }}>{b.parking_slots?.slot_number}</span>
                         </div>
                         <div style={{ flex: 1 }}>
                           <div style={{ fontSize: 14, fontWeight: 700, color: '#1A2420' }}>{b.user_name}</div>
                           <div style={{ fontSize: 12, color: '#68736B', marginTop: 2 }}>{formatDate(b.start_time)}, {formatTime(b.start_time)} – {formatTime(b.end_time)}</div>
                         </div>
                         <StatusBadge status={b.status} small />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Slots management */}
          {tab === 'slots' && (
            <div style={{ animation: 'fade-in 0.3s ease-out' }}>
              <div className="soft-card" style={{ padding: '32px', borderRadius: 28, background: '#FFFFFF', boxShadow: '0 24px 48px rgba(23,76,60,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1A2420', letterSpacing: '-0.02em' }}>Manage Parking Slots</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#68736B' }}>Configure and control parking availability.</p>
                  </div>
                  <button className="soft-btn-primary" style={{ padding: '12px 20px', borderRadius: 16, fontSize: 14 }} onClick={() => setShowAddSlot(true)}>
                    <Plus size={16} /> Add Slot
                  </button>
                </div>

                {slots.length === 0 ? (
                  <div style={{ padding: '64px 0', textAlign: 'center' }}>
                     <Database size={32} color="#9AADA5" style={{ margin: '0 auto 16px' }} />
                     <div style={{ fontSize: 15, fontWeight: 700, color: '#1A2420' }}>No slots configured</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#F8FAF7', textAlign: 'left', color: '#627068', borderBottom: '1px solid #EAEFEA' }}>
                          <th style={{ padding: '16px 20px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Slot</th>
                          <th style={{ padding: '16px 20px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Area</th>
                          <th style={{ padding: '16px 20px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                          <th style={{ padding: '16px 20px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Status</th>
                          <th style={{ padding: '16px 20px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Controls</th>
                        </tr>
                      </thead>
                      <tbody>
                        {slots.map(s => {
                          let currentStatus = s.is_active ? 'AVAILABLE' : 'UNAVAILABLE';
                          if (s.is_active) {
                            const occupied = bookings.find(b => b.slot_id === s.id && b.status === 'CHECKED_IN');
                            if (occupied) {
                              currentStatus = 'OCCUPIED';
                            } else {
                              const now = new Date().getTime();
                              const reserved = bookings.find(b =>
                                b.slot_id === s.id &&
                                b.status === 'CONFIRMED' &&
                                new Date(b.end_time).getTime() > now
                              );
                              if (reserved) currentStatus = 'RESERVED';
                            }
                          }

                          return (
                            <tr key={s.id} style={{ borderBottom: '1px solid #F0F4F1' }}>
                              <td style={{ padding: '16px 20px', fontWeight: 800, color: '#1A2420', fontSize: 15 }}>{s.slot_number}</td>
                              <td style={{ padding: '16px 20px', color: '#627068', fontSize: 13, fontWeight: 600 }}>{(s as any).parking_areas?.name}</td>
                              <td style={{ padding: '16px 20px', color: '#174C3C', fontSize: 13, fontWeight: 700 }}>{s.slot_type}</td>
                              <td style={{ padding: '16px 20px' }}>
                                <StatusBadge status={currentStatus} small />
                              </td>
                              <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                <button
                                  className={s.is_active ? "btn-secondary" : "soft-btn-primary"}
                                  style={{
                                    padding: '8px 16px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                                    color: s.is_active ? '#991B1B' : undefined,
                                    border: s.is_active ? '1px solid #FEE2E2' : undefined,
                                    background: s.is_active ? '#FEF2F2' : undefined
                                  }}
                                  onClick={() => handleToggleSlot(s as any)}
                                >
                                  {s.is_active ? 'Disable' : 'Enable'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reservations */}
          {tab === 'reservations' && (
            <div style={{ animation: 'fade-in 0.3s ease-out' }}>
              <div className="soft-card" style={{ padding: '32px', borderRadius: 28, background: '#FFFFFF', boxShadow: '0 24px 48px rgba(23,76,60,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1A2420', letterSpacing: '-0.02em' }}>System Reservations</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#68736B' }}>View and filter all campus bookings.</p>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#9AADA5' }} />
                      <input
                        className="soft-input"
                        placeholder="Search bookings…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ paddingLeft: 42, width: 220, borderRadius: 16, height: 44, fontSize: 13 }}
                      />
                    </div>
                    <select className="soft-input" style={{ width: 160, borderRadius: 16, height: 44, fontSize: 13 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                      <option value="">All Statuses</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="CHECKED_IN">Checked In</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>

                {bookings.length === 0 ? (
                  <div style={{ padding: '64px 0', textAlign: 'center' }}>
                     <Clock size={32} color="#9AADA5" style={{ margin: '0 auto 16px' }} />
                     <div style={{ fontSize: 15, fontWeight: 700, color: '#1A2420' }}>No bookings match filters</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#F8FAF7', textAlign: 'left', color: '#627068', borderBottom: '1px solid #EAEFEA' }}>
                          <th style={{ padding: '16px 20px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID / Slot</th>
                          <th style={{ padding: '16px 20px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>User Details</th>
                          <th style={{ padding: '16px 20px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schedule</th>
                          <th style={{ padding: '16px 20px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                          <th style={{ padding: '16px 20px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map(b => (
                          <tr key={b.id} style={{ borderBottom: '1px solid #F0F4F1' }}>
                            <td style={{ padding: '16px 20px' }}>
                               <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#627068' }}>{b.booking_code}</div>
                               <div style={{ fontSize: 14, fontWeight: 800, color: '#1A2420', marginTop: 4 }}>Slot {b.parking_slots?.slot_number}</div>
                            </td>
                            <td style={{ padding: '16px 20px' }}>
                               <div style={{ fontSize: 14, fontWeight: 700, color: '#1A2420' }}>{b.user_name}</div>
                               <div style={{ fontSize: 12, color: '#627068', marginTop: 2, fontFamily: 'monospace' }}>{b.license_plate}</div>
                            </td>
                            <td style={{ padding: '16px 20px', color: '#68736B' }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1A2420' }}>{formatDate(b.start_time)}</div>
                              <div style={{ fontSize: 12, marginTop: 2 }}>{formatTime(b.start_time)} – {formatTime(b.end_time)}</div>
                            </td>
                            <td style={{ padding: '16px 20px' }}>
                               <StatusBadge status={b.status} small />
                            </td>
                            <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                              {b.status === 'CONFIRMED' && (
                                <button
                                  className="btn-secondary"
                                  style={{ padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, color: '#B91C1C', border: '1px solid #FEE2E2', background: '#FEF2F2' }}
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
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scan QR — embed scan page inline */}
          {tab === 'scan' && (
            <div style={{ animation: 'fade-in 0.3s ease-out' }}>
              <div className="soft-card" style={{ padding: '32px', borderRadius: 28, background: '#FFFFFF', boxShadow: '0 24px 48px rgba(23,76,60,0.04)', maxWidth: 640 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                   <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(199,243,107,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShieldCheck size={20} color="#174C3C" />
                   </div>
                   <div>
                      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1A2420', letterSpacing: '-0.02em' }}>Pass Verification</h3>
                      <p style={{ margin: '2px 0 0', fontSize: 13, color: '#68736B' }}>Manually validate bookings if a gatekeeper needs assistance.</p>
                   </div>
                </div>
                <InlineScan />
              </div>
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
      setMsg('✅ Checked in successfully.'); setBooking({ ...booking, status: 'CHECKED_IN' });
    } catch (e: any) { setError(e.message ?? 'Failed to check in.'); }
  }

  async function checkout() {
    if (!booking || booking.status !== 'CHECKED_IN') return;
    try {
      await updateBookingStatus(booking.id, 'COMPLETED');
      setMsg('✅ Checked out successfully.'); setBooking({ ...booking, status: 'COMPLETED' });
    } catch (e: any) { setError(e.message ?? 'Failed to check out.'); }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <label className="ps-label" style={{ marginBottom: 8 }}>Booking Reference Code</label>
        <div style={{ display: 'flex', gap: 12 }}>
          <input 
            className="soft-input" 
            placeholder="e.g. PS-20241021-001" 
            value={code} 
            onChange={e => setCode(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && validate()}
            style={{ borderRadius: 16, height: 52, flex: 1, fontSize: 14 }}
          />
          <button className="soft-btn-primary" style={{ padding: '0 24px', borderRadius: 16, height: 52, fontSize: 14 }} onClick={validate} disabled={loading}>{loading ? '…' : 'Validate'}</button>
        </div>
      </div>

      {error && <div style={{ color: '#991B1B', fontSize: 13, padding: '14px 16px', background: '#FEF2F2', borderRadius: 14, marginBottom: 16, border: '1px solid #FEE2E2', fontWeight: 600 }}>{error}</div>}
      {msg && <div style={{ color: '#065F46', fontSize: 13, padding: '14px 16px', background: '#ECFDF5', borderRadius: 14, marginBottom: 16, border: '1px solid #D1FAE5', fontWeight: 700 }}>{msg}</div>}

      {booking && (
        <div style={{ background: '#F8FAF7', padding: '24px', borderRadius: 20, border: '1px solid #EAEFEA' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: '#1A2420' }}>Pass Confirmed</span>
            <StatusBadge status={booking.status} />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
             <div>
                <div style={{ fontSize: 11, color: '#9AADA5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Driver & Slot</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1A2420', marginTop: 4 }}>
                   {booking.user_name} <span style={{ color: '#9AADA5', margin: '0 4px' }}>•</span> {booking.parking_slots?.slot_number}
                </div>
             </div>
             <div>
                <div style={{ fontSize: 11, color: '#9AADA5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schedule</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1A2420', marginTop: 4 }}>
                   {formatDate(booking.start_time).split(',')[0]}<br/>
                   <span style={{ fontSize: 12, color: '#627068' }}>{formatTime(booking.start_time)}–{formatTime(booking.end_time)}</span>
                </div>
             </div>
          </div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="soft-btn-primary" style={{ flex: 1, padding: '14px', borderRadius: 14, fontSize: 13, justifyContent: 'center' }} disabled={booking.status !== 'CONFIRMED'} onClick={checkin}>Confirm Check-In</button>
            <button className="btn-secondary" style={{ flex: 1, padding: '14px', borderRadius: 14, fontSize: 13, fontWeight: 700, justifyContent: 'center' }} disabled={booking.status !== 'CHECKED_IN'} onClick={checkout}>Check-Out</button>
          </div>
        </div>
      )}
    </div>
  );
}
