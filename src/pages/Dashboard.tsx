import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ParkingSquare, Car, Zap, MapPin, Clock, ArrowRight, Activity, Calendar, Sparkles } from 'lucide-react';
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
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <TopBar title="Overview" subtitle="Smart Campus Parking" />

      <div className="app-content" style={{ maxWidth: 1600, margin: '0 auto' }}>
        
        {/* Main Grid Layout matching the poster reference */}
        <div className="dashboard-grid">
           
           {/* LEFT COLUMN: Hero + Map + Bottom Cards */}
           <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
              
              {/* Hero Greeting */}
              <div style={{ padding: '8px 0 16px 0', position: 'relative' }}>
                 <h1 className="dashboard-hero-h1" style={{ 
                     fontWeight: 800, color: '#174C3C', 
                     letterSpacing: '-0.03em', lineHeight: 1.1, margin: 0
                 }}>
                   {greeting},<br/>
                   <span style={{ color: '#1A2420' }}>{profile?.full_name?.split(' ')[0] || 'User'}!</span> 
                   <span style={{ 
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        marginLeft: 12, width: 34, height: 34, borderRadius: 10,
                        background: 'rgba(199, 243, 107, 0.25)', border: '1px solid rgba(199, 243, 107, 0.4)',
                        verticalAlign: 'middle'
                    }}>
                      <Sparkles size={18} color="#174C3C" />
                    </span>
                 </h1>
                 <p style={{ fontSize: 15, color: '#627068', marginTop: 12, fontWeight: 500, maxWidth: 400 }}>
                   Find the best parking spot before you arrive and skip the campus traffic.
                 </p>
                 <style>{`
                    @keyframes wave {
                        0% { transform: rotate( 0.0deg) }
                       10% { transform: rotate(14.0deg) }
                       20% { transform: rotate(-8.0deg) }
                       30% { transform: rotate(14.0deg) }
                       40% { transform: rotate(-4.0deg) }
                       50% { transform: rotate(10.0deg) }
                       60% { transform: rotate( 0.0deg) }
                      100% { transform: rotate( 0.0deg) }
                    }
                 `}</style>
              </div>

              {/* Immersive Campus Map + Parking Facility */}
              <div className="soft-card map-container" style={{ 
                  position: 'relative', overflow: 'hidden', padding: 0, 
                  borderRadius: 32, minHeight: 540,
                  backgroundImage: 'url(/campus-bg.jpg)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  boxShadow: '0 24px 48px rgba(23,76,60,0.10), inset 0 2px 8px rgba(255,255,255,0.7)',
                  display: 'flex', flexDirection: 'column'
              }}>
                  {/* Subtle overlay for contrast */}
                  <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(180deg, rgba(250,248,242,0.15) 0%, rgba(250,248,242,0.35) 100%)',
                      pointerEvents: 'none', zIndex: 1,
                  }} />
                  <div style={{
                      position: 'absolute', top: 24, left: 24, zIndex: 10,
                      background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      padding: '12px 20px', borderRadius: 20, 
                      boxShadow: '0 12px 32px rgba(23,76,60,0.12), inset 0 1px 0 rgba(255,255,255,1)',
                      display: 'flex', alignItems: 'center', gap: 16, 
                      border: '1px solid rgba(227, 235, 230, 0.8)'
                  }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ 
                              width: 44, height: 44, borderRadius: 14, 
                              background: '#F0F7F4', display: 'flex', 
                              alignItems: 'center', justifyContent: 'center', color: '#174C3C' 
                          }}>
                              <Calendar size={20} />
                          </div>
                          <div style={{ borderRight: '1.5px solid #E3EBE6', paddingRight: 20 }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: '#627068', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Arrival Time</div>
                              <div style={{ fontSize: 15, fontWeight: 700, color: '#1A2420', marginTop: 2 }}>Today, Now</div>
                          </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingLeft: 4 }}>
                          <div style={{ 
                              width: 44, height: 44, borderRadius: 14, 
                              background: '#E6F2ED', display: 'flex', 
                              alignItems: 'center', justifyContent: 'center', color: '#059669' 
                          }}>
                              <MapPin size={20} />
                          </div>
                          <div>
                              <div style={{ fontSize: 11, fontWeight: 800, color: '#627068', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select Zone</div>
                              <select
                                value={selectedArea?.id ?? ''}
                                onChange={e => {
                                  const a = areas.find(x => x.id === e.target.value);
                                  if (a) setSelectedArea(a);
                                }}
                                style={{ 
                                    border: 'none', background: 'transparent', 
                                    fontSize: 15, fontWeight: 700, color: '#1A2420', 
                                    outline: 'none', cursor: 'pointer', padding: 0, margin: 0, 
                                    width: 140 
                                }}
                              >
                                {areas.map(a => (
                                  <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                              </select>
                          </div>
                      </div>
                  </div>

                  {/* Parking Facility Surface */}
                  <div style={{ 
                      flex: 1, padding: '90px 32px 32px 32px', 
                      display: 'flex', justifyContent: 'center', alignItems: 'center',
                      position: 'relative', zIndex: 5
                  }}>
                     {loading ? (
                        <div className="spinner" style={{ margin: 'auto' }} />
                     ) : slots.length === 0 ? (
                        <div className="empty-state">No slots found</div>
                     ) : (
                        <div style={{
                            padding: '24px 28px 20px',
                            background: 'rgba(250, 248, 242, 0.75)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            borderRadius: 24,
                            border: '1px solid rgba(220, 228, 220, 0.6)',
                            boxShadow: '0 24px 48px rgba(23,76,60,0.12), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,1)',
                            transform: 'translateZ(0)', /* Fixes webkit white flash bug */
                        }}>
                            {/* Facility header */}
                            <div style={{ 
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                marginBottom: 18,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{
                                        width: 5, height: 22, borderRadius: 3,
                                        background: 'linear-gradient(to bottom, #C7F36B, #174C3C)',
                                    }} />
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: '#174C3C', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Parking Facility</div>
                                        <div style={{ fontSize: 10, color: '#627068', fontWeight: 500, marginTop: 1 }}>{selectedArea?.name}</div>
                                    </div>
                                </div>
                                <ParkingLegend />
                            </div>

                            {/* Asphalt surface */}
                            <div className="parking-map-scroll">
                                <div className="parking-map-inner">
                                    <div style={{
                                        background: 'linear-gradient(160deg, #ECECE8 0%, #E4E4DF 100%)',
                                        borderRadius: 16,
                                        padding: '18px 14px',
                                        border: '1px solid rgba(180,180,170,0.4)',
                                        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06), inset 0 -1px 3px rgba(255,255,255,0.5)',
                                        position: 'relative', overflow: 'hidden',
                                    }}>
                                        {/* Subtle asphalt texture */}
                                        <div style={{
                                            position: 'absolute', inset: 0, pointerEvents: 'none',
                                            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(160,160,150,0.08) 18px, rgba(160,160,150,0.08) 19px)',
                                            borderRadius: 16,
                                        }} />
                                        <ParkingGrid 
                                            slots={slots} 
                                            selectedSlotId={selectedSlot?.id} 
                                            onSlotClick={s => setSelectedSlot(prev => prev?.id === s.id ? null : s)} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                     )}
                  </div>
              </div>

              {/* Bottom Quick widgets */}
              <div className="dashboard-bottom-grid">
                  <div className="soft-card" style={{ padding: '24px 28px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A2420', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                             <Zap size={18} color="#174C3C" /> 
                             Quick Actions
                          </h3>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                         <button className="soft-btn-primary" style={{ background: '#F4F7F4', color: '#174C3C', boxShadow: 'none', padding: '14px', fontSize: 13.5, flexDirection: 'row' }} onClick={() => navigate('/reserve')}>
                            <Car size={18} /> Book Spot
                         </button>
                         <button className="soft-btn-primary" style={{ background: '#F4F7F4', color: '#174C3C', boxShadow: 'none', padding: '14px', fontSize: 13.5, flexDirection: 'row' }} onClick={() => navigate('/bookings')}>
                            <Clock size={18} /> My Bookings
                         </button>
                      </div>
                  </div>
                  
                  {/* Selected Slot Action (only shows when slot clicked, otherwise placeholder) */}
                  <div className="soft-card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      {selectedSlot ? (
                          <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#627068', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Selected Spot</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                  <div style={{ 
                                      width: 52, height: 52, borderRadius: 16, background: '#C7F36B', 
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                      fontSize: 20, fontWeight: 800, color: '#174C3C', 
                                      boxShadow: '0 12px 24px rgba(199,243,107,0.35)' 
                                  }}>
                                      {selectedSlot.slot_number}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1A2420' }}>{selectedSlot.slot_type}</div>
                                      <div style={{ fontSize: 13, color: '#627068', marginTop: 2 }}>{selectedArea?.name}</div>
                                  </div>
                                  <button className="btn-primary" style={{ padding: '12px 20px', borderRadius: 12, background: '#174C3C', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/reserve', { state: { slot: selectedSlot, area: selectedArea } })}>
                                      Reserve <ArrowRight size={16} />
                                  </button>
                              </div>
                          </div>
                      ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#9AADA5', height: '100%' }}>
                              <div style={{ 
                                  width: 52, height: 52, borderRadius: 16, border: '2px dashed #E3EBE6', 
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: '#F8FAF7'
                              }}>
                                  <MapPin size={22} color="#C8D9D0" />
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>
                                  Select a parking spot on the <br/>map to book instantly.
                              </div>
                          </div>
                      )}
                  </div>
              </div>
           </div>

           {/* RIGHT COLUMN: AI & Stats */}
           <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
               
               {/* AI Recommendation Card (Hero styling from poster) */}
               <div className="soft-card" style={{ padding: 24, background: '#FFFFFF' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                       <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1A2420', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                           <Zap size={16} color="#059669" /> AI Recommendation
                       </h3>
                       <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#D9F2E4', padding: '4px 10px', borderRadius: 20 }}>Best Option</span>
                   </div>
                   
                   <div style={{ 
                       background: 'linear-gradient(145deg, #174C3C, #0E3329)', 
                       borderRadius: 20, padding: 24, color: '#fff',
                       position: 'relative', overflow: 'hidden',
                       boxShadow: '0 16px 32px rgba(23,76,60,0.24)'
                   }}>
                       {/* Decorative BG pattern */}
                       <div style={{ position: 'absolute', right: -30, top: -30, opacity: 0.05, transform: 'rotate(15deg)' }}>
                           <svg width="180" height="180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                       </div>

                       <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                           <div style={{ 
                               width: 48, height: 48, borderRadius: 14, 
                               background: '#C7F36B', display: 'flex', 
                               alignItems: 'center', justifyContent: 'center', color: '#174C3C',
                               boxShadow: '0 8px 16px rgba(199,243,107,0.2)'
                           }}>
                               <MapPin size={24} />
                           </div>
                           <div style={{ flex: 1 }}>
                               <div style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', marginBottom: 2, lineHeight: 1.2 }}>
                                   {selectedArea?.name || 'Loading...'}
                               </div>
                               <div style={{ fontSize: 13, color: '#AABCB4', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}>
                                   <Activity size={14} color="#C7F36B" /> High Availability
                               </div>
                           </div>
                       </div>

                       <div style={{ 
                           background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 16px', 
                           display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
                           border: '1px solid rgba(255,255,255,0.1)'
                       }}>
                           <div>
                               <div style={{ fontSize: 11, color: '#AABCB4', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Predicted Avg</div>
                               <div style={{ fontSize: 20, fontWeight: 800, color: '#C7F36B', marginTop: 2 }}>
                                   {stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 0}%
                               </div>
                           </div>
                           <div style={{ textAlign: 'right' }}>
                               <div style={{ fontSize: 11, color: '#AABCB4', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Spaces Left</div>
                               <div style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', marginTop: 4 }}>
                                   {stats.available} slots
                               </div>
                           </div>
                       </div>

                       <button 
                           className="soft-btn-primary" 
                           style={{ background: '#C7F36B', color: '#174C3C', padding: '14px', fontSize: 14, borderRadius: 14, width: '100%' }} 
                           onClick={() => navigate('/reserve')}
                       >
                           Book Parking Spot <ArrowRight size={16} />
                       </button>
                   </div>
               </div>

               {/* Stats Grid */}
               <div className="stats-grid">
                   <StatCard label="Available" value={stats.available} icon={<Car size={18} />} accent="#D9F2E4" iconColor="#065F46" pct={stats.total ? `${Math.round((stats.available / stats.total) * 100)}%` : undefined} />
                   <StatCard label="Occupied" value={stats.occupied} icon={<ParkingSquare size={18} />} accent="#FCE4E4" iconColor="#B91C1C" pct={stats.total ? `${Math.round((stats.occupied / stats.total) * 100)}%` : undefined} />
               </div>

               {/* AI Demand Forecast Widget */}
               <DemandForecast />

           </div>
        </div>
      </div>
    </>
  );
}


