import { useState, useEffect } from 'react';
import { CheckCircle, QrCode, LayoutDashboard, ShieldCheck, Clock, User, ArrowRight } from 'lucide-react';
import TopBar from '../../components/TopBar';
import StatusBadge from '../../components/StatusBadge';
import { supabase } from '../../lib/supabase';
import { fetchAllBookings, formatTime, fetchDashboardStats } from '../../api';
import type { Booking } from '../../types';

export default function Overview() {
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({ total: 0, available: 0, reserved: 0, occupied: 0 });
  const [todayCheckins, setTodayCheckins] = useState(0);

  const loadData = async () => {
    try {
      const bData = await fetchAllBookings();
      setRecentBookings(bData.slice(0, 15)); // top 15 recent

      const todayStr = new Date().toISOString().split('T')[0];
      const checkins = bData.filter(b => b.status === 'CHECKED_IN' || b.status === 'COMPLETED').filter(b => b.start_time.startsWith(todayStr) || b.checked_in_at?.startsWith(todayStr)).length;
      setTodayCheckins(checkins);

      const sData = await fetchDashboardStats();
      setStats(sData);
    } catch (e) {
      console.error('Failed to load overview data', e);
    }
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('gatekeeper-overview-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
        loadData();
      })
      .subscribe();

    const interval = setInterval(loadData, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <TopBar title="Overview" subtitle="Gatekeeper Command Center" />
      <div className="app-content">
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 16px' }}>
          
          {/* Welcome Banner */}
          <div className="soft-card" style={{ padding: '32px', borderRadius: 28, background: 'linear-gradient(135deg, #174C3C 0%, #0B2920 100%)', color: '#FFFFFF', marginBottom: 24, boxShadow: '0 24px 48px rgba(23,76,60,0.2)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: '#C7F36B', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(199,243,107,0.2)' }}>
                   <ShieldCheck size={24} color="#174C3C" />
                </div>
                <div>
                   <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF' }}>Gatekeeper Overview</h2>
                   <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#A7C9BE' }}>Monitor campus parking capacity and active reservations.</p>
                </div>
             </div>
          </div>

          {/* Dashboard Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
            <div className="soft-card" style={{ padding: '24px', borderRadius: 24, background: '#FFFFFF', border: '1px solid #EAEFEA', boxShadow: '0 12px 24px rgba(23,76,60,0.04)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: '#F8FAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '1px solid #EAEFEA' }}>
                <LayoutDashboard size={20} color="#174C3C" />
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#1A2420', lineHeight: 1 }}>{stats.total}</div>
              <div style={{ fontSize: 13, color: '#627068', marginTop: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Slots</div>
            </div>
            
            <div className="soft-card" style={{ padding: '24px', borderRadius: 24, background: '#FFFFFF', border: '1px solid #DDF5E5', boxShadow: '0 12px 24px rgba(6,95,70,0.06)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: '#DDF5E5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <CheckCircle size={20} color="#059669" />
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#059669', lineHeight: 1 }}>{stats.available}</div>
              <div style={{ fontSize: 13, color: '#065F46', marginTop: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available</div>
            </div>
            
            <div className="soft-card" style={{ padding: '24px', borderRadius: 24, background: '#FFFFFF', border: '1px solid #FEF0C7', boxShadow: '0 12px 24px rgba(146,64,14,0.06)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: '#FEF0C7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <LayoutDashboard size={20} color="#B45309" />
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#B45309', lineHeight: 1 }}>{stats.reserved}</div>
              <div style={{ fontSize: 13, color: '#92400E', marginTop: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reserved</div>
            </div>
            
            <div className="soft-card" style={{ padding: '24px', borderRadius: 24, background: '#FFFFFF', border: '1px solid #FEE2E2', boxShadow: '0 12px 24px rgba(220,38,38,0.06)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <QrCode size={20} color="#DC2626" />
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#DC2626', lineHeight: 1 }}>{stats.occupied}</div>
              <div style={{ fontSize: 13, color: '#991B1B', marginTop: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Occupied</div>
            </div>
            
            <div className="soft-card" style={{ padding: '24px', borderRadius: 24, background: '#1A2420', boxShadow: '0 12px 32px rgba(11,21,16,0.3)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(199,243,107,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '1px solid rgba(199,243,107,0.2)' }}>
                <CheckCircle size={20} color="#C7F36B" />
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>{todayCheckins}</div>
              <div style={{ fontSize: 13, color: '#C7F36B', marginTop: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Scans</div>
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="soft-card" style={{ padding: '32px', borderRadius: 28, background: '#FFFFFF', boxShadow: '0 24px 48px rgba(23,76,60,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
               <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1A2420', letterSpacing: '-0.01em' }}>Recent Gate Activity</h3>
            </div>
            
            {recentBookings.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center' }}>
                 <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F8FAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px dashed #D5DDD6' }}>
                    <Clock size={24} color="#9AADA5" />
                 </div>
                 <div style={{ fontSize: 15, fontWeight: 700, color: '#627068' }}>No recent activity</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {recentBookings.map(b => (
                  <div key={b.id} className="gk-list-item" style={{ 
                      display: 'flex', alignItems: 'center', gap: 16, 
                      padding: '16px 20px', background: '#F8FAF7', borderRadius: 16,
                      border: '1px solid #EAEFEA', transition: 'background 0.2s',
                  }} onMouseOver={e => e.currentTarget.style.background = '#FFFFFF'} onMouseOut={e => e.currentTarget.style.background = '#F8FAF7'}>
                      
                      {/* Driver Avatar */}
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: '#E3EBE6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <User size={20} color="#174C3C" />
                      </div>
                      
                      {/* Details */}
                      <div className="gk-list-grid" style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, alignItems: 'center' }}>
                          <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#1A2420', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.user_name}</div>
                              <div style={{ fontSize: 12, color: '#627068', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                 <Clock size={12} /> {formatTime(b.start_time)}
                              </div>
                          </div>
                          
                          <div>
                              <div style={{ fontSize: 11, color: '#9AADA5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Slot</div>
                              <div style={{ fontSize: 14, fontWeight: 800, color: '#174C3C', marginTop: 2 }}>{b.parking_slots?.slot_number}</div>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <StatusBadge status={b.status} small />
                          </div>
                      </div>
                      
                      {/* Action */}
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #EAEFEA', color: '#9AADA5', cursor: 'pointer' }}>
                         <ArrowRight size={14} />
                      </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
