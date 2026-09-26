import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ParkingSquare, Car, Zap, MapPin, Clock } from 'lucide-react';
import TopBar from '../components/TopBar';
import StatCard from '../components/StatCard';
import ParkingGrid, { ParkingLegend } from '../components/ParkingGrid';
import {
  fetchParkingAreas, fetchSlotsForArea, fetchDashboardStats,
  fetchConflictingSlotIds, computeSlotStatus,
} from '../api';
import type { ParkingArea, SlotWithStatus, DashboardStats } from '../types';
import { useAuth } from '../contexts/AuthContext';


export default function Dashboard() {
  const navigate = useNavigate();
  const [areas, setAreas] = useState<ParkingArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<ParkingArea | null>(null);
  const [slots, setSlots] = useState<SlotWithStatus[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ total: 0, available: 0, reserved: 0, occupied: 0 });
  const [selectedSlot, setSelectedSlot] = useState<SlotWithStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAreas = useCallback(async () => {
    try {
      const data = await fetchParkingAreas();
      setAreas(data);
      if (data.length > 0 && !selectedArea) setSelectedArea(data[0]);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadSlotsAndStats = useCallback(async () => {
    if (!selectedArea) return;
    setLoading(true);
    try {
      const [rawSlots, conflictIds, statsData] = await Promise.all([
        fetchSlotsForArea(selectedArea.id),
        fetchConflictingSlotIds(selectedArea.id, new Date().toISOString(), new Date(Date.now() + 3600000).toISOString()),
        fetchDashboardStats(selectedArea.id),
      ]);

      const withStatus: SlotWithStatus[] = rawSlots.map((s: any) => ({
        ...s,
        status: computeSlotStatus(s, conflictIds),
      }));

      setSlots(withStatus);
      setStats(statsData);
      setSelectedSlot(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedArea]);

  useEffect(() => { loadAreas(); }, [loadAreas]);
  useEffect(() => { loadSlotsAndStats(); }, [loadSlotsAndStats]);

  const { profile } = useAuth();
  
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <>
      <TopBar title={`${greeting}, ${profile?.full_name?.split(' ')[0] || 'User'}! 👋`} subtitle="Find and manage your parking spots" />

      <div className="app-content">
        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          <StatCard
            label="Total Slots" value={stats.total}
            icon={<ParkingSquare size={18} />}
            accent="#E8F4EF" iconColor="#174C3C"
          />
          <StatCard
            label="Available" value={stats.available}
            icon={<Car size={18} />}
            accent="#DDF5E5" iconColor="#065F46"
            pct={stats.total ? `${Math.round((stats.available / stats.total) * 100)}%` : undefined}
          />
          <StatCard
            label="Reserved" value={stats.reserved}
            icon={<Clock size={18} />}
            accent="#FEF0C7" iconColor="#92400E"
            pct={stats.total ? `${Math.round((stats.reserved / stats.total) * 100)}%` : undefined}
          />
          <StatCard
            label="Occupied" value={stats.occupied}
            icon={<Zap size={18} />}
            accent="#FCE2E2" iconColor="#B91C1C"
            pct={stats.total ? `${Math.round((stats.occupied / stats.total) * 100)}%` : undefined}
          />
        </div>

        {/* Main content */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 14, alignItems: 'start' }}>

          {/* Parking layout */}
          <div className="ps-card">
            <div className="section-header" style={{ marginBottom: 12 }}>
              <span className="section-title">Campus Parking Layout</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Area selector */}
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedArea?.id ?? ''}
                    onChange={e => {
                      const a = areas.find(x => x.id === e.target.value);
                      if (a) setSelectedArea(a);
                    }}
                    className="ps-input"
                    style={{ paddingRight: 30, cursor: 'pointer', minWidth: 160 }}
                  >
                    {areas.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div style={{ marginBottom: 12 }}>
              <ParkingLegend />
            </div>

            {/* Grid */}
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
                <div className="spinner" />
              </div>
            ) : slots.length === 0 ? (
              <div className="empty-state">
                <ParkingSquare size={32} color="#C9CFC8" />
                <p>No slots found for this area.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <ParkingGrid
                  slots={slots}
                  selectedSlotId={selectedSlot?.id}
                  onSlotClick={s => setSelectedSlot(prev => prev?.id === s.id ? null : s)}
                />
              </div>
            )}

            {/* Selected slot info */}
            {selectedSlot && (
              <div style={{
                marginTop: 16, padding: '12px 14px',
                background: '#F7FBF8', border: '1px solid #C7F36B',
                borderRadius: 10, display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: '#C7F36B', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13, color: '#174C3C', flexShrink: 0,
                }}>
                  {selectedSlot.slot_number}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{selectedSlot.slot_number}</div>
                  <div style={{ fontSize: 12, color: '#68736B' }}>
                    {selectedArea?.name} · {selectedSlot.slot_type}
                  </div>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => navigate('/reserve', { state: { slot: selectedSlot, area: selectedArea } })}
                >
                  Reserve Slot →
                </button>
              </div>
            )}
          </div>

          {/* Right panel: parking areas list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="ps-card" style={{ padding: '16px' }}>
              <div className="section-title" style={{ marginBottom: 12 }}>Parking Areas</div>
              {areas.map(area => {
                return (
                  <div
                    key={area.id}
                    className={`area-item${selectedArea?.id === area.id ? ' active' : ''}`}
                    onClick={() => setSelectedArea(area)}
                  >
                    <div className="area-icon">
                      <MapPin size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#202923' }}>{area.name}</div>
                      <div style={{ fontSize: 11.5, color: '#68736B' }}>
                        {slots.filter(() => true).length > 0 && selectedArea?.id === area.id
                          ? `${stats.available} available`
                          : area.description ?? ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Peak hours hint */}
            <div className="ps-card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Clock size={14} color="#68736B" />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#202923' }}>Peak Hours</span>
              </div>
              <div style={{ fontSize: 12, color: '#68736B' }}>10:00 AM – 02:00 PM</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                Slots fill quickly during peak hours. Reserve early.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
