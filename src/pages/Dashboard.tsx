import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ParkingSquare, Car, Zap, MapPin, Clock } from 'lucide-react';
import TopBar from '../components/TopBar';
import StatCard from '../components/StatCard';
import ParkingGrid, { ParkingLegend } from '../components/ParkingGrid';
import DemandForecast from '../components/DemandForecast';
import { supabase } from '../lib/supabase';
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
  useEffect(() => {
    loadSlotsAndStats();

    const channel = supabase
      .channel('user-dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
        loadSlotsAndStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slots' }, () => {
        loadSlotsAndStats();
      })
      .subscribe();

    const interval = setInterval(loadSlotsAndStats, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [loadSlotsAndStats]);

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
          <div className="soft-card" style={{ padding: '24px' }}>
            <div className="section-header" style={{ marginBottom: 14 }}>
              <div>
                <span className="section-title" style={{ fontSize: 16 }}>Campus Parking Layout</span>
                <p style={{ fontSize: 12, color: '#68736B', marginTop: 2 }}>Interactive real-time spot matrix and status</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Area selector */}
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedArea?.id ?? ''}
                    onChange={e => {
                      const a = areas.find(x => x.id === e.target.value);
                      if (a) setSelectedArea(a);
                    }}
                    className="soft-input"
                    style={{ paddingRight: 30, cursor: 'pointer', minWidth: 170, padding: '8px 14px', fontSize: 13 }}
                  >
                    {areas.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div style={{ marginBottom: 16, padding: '10px 14px', background: '#F8FAF8', borderRadius: 12, border: '1px solid #EAEFEA' }}>
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
              <div style={{ overflowX: 'auto', padding: '8px 4px' }}>
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
                marginTop: 18, padding: '14px 18px',
                background: '#F7FBF8', border: '1.5px solid #C7F36B',
                borderRadius: 14, display: 'flex', alignItems: 'center', gap: 14,
                boxShadow: '0 4px 14px rgba(23,76,60,0.06)'
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: '#C7F36B', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 14, color: '#174C3C', flexShrink: 0,
                  boxShadow: '0 4px 10px rgba(199,243,107,0.4)',
                }}>
                  {selectedSlot.slot_number}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#174C3C' }}>Slot {selectedSlot.slot_number} Selected</div>
                  <div style={{ fontSize: 12, color: '#68736B' }}>
                    {selectedArea?.name} · {selectedSlot.slot_type}
                  </div>
                </div>
                <button
                  className="soft-btn-primary"
                  style={{ width: 'auto', padding: '10px 18px', fontSize: 13 }}
                  onClick={() => navigate('/reserve', { state: { slot: selectedSlot, area: selectedArea } })}
                >
                  Reserve Slot →
                </button>
              </div>
            )}
          </div>

          {/* Right panel: parking areas list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="soft-card" style={{ padding: '20px' }}>
              <div className="section-title" style={{ marginBottom: 12, fontSize: 14 }}>Parking Locations</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {areas.map(area => {
                  const isSelected = selectedArea?.id === area.id;
                  return (
                    <div
                      key={area.id}
                      className={`area-item${isSelected ? ' active' : ''}`}
                      onClick={() => setSelectedArea(area)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        transition: 'all 0.18s ease',
                      }}
                    >
                      <div className="area-icon">
                        <MapPin size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#202923' }}>{area.name}</div>
                        <div style={{ fontSize: 11.5, color: '#68736B' }}>
                          {slots.filter(() => true).length > 0 && isSelected
                            ? `${stats.available} available spots`
                            : area.description ?? ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Peak hours hint */}
            <div className="soft-card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#FEF0C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={15} color="#92400E" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#202923' }}>Peak Campus Hours</span>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#174C3C' }}>10:00 AM – 02:00 PM</div>
              <div style={{ fontSize: 11.5, color: '#68736B', marginTop: 4, lineHeight: 1.4 }}>
                Demand is highest during mid-day lectures. Slots fill quickly, reserve beforehand.
              </div>
            </div>
          </div>
        </div>
        
        {/* AI Demand Forecast Section */}
        <DemandForecast />
      </div>
    </>
  );
}

