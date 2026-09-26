import { useState, useEffect } from 'react';
import { CheckCircle, QrCode, LayoutDashboard } from 'lucide-react';
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
        
        {/* Dashboard Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22, maxWidth: 980, margin: '0 auto 22px' }}>
          <div className="soft-stat-card">
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#EDF2EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LayoutDashboard size={20} color="#174C3C" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#174C3C', lineHeight: 1 }}>{stats.total}</div>
              <div style={{ fontSize: 12, color: '#68736B', marginTop: 4, fontWeight: 600 }}>Total Slots</div>
            </div>
          </div>
          <div className="soft-stat-card">
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#DDF5E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={20} color="#065F46" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#065F46', lineHeight: 1 }}>{stats.available}</div>
              <div style={{ fontSize: 12, color: '#68736B', marginTop: 4, fontWeight: 600 }}>Available Slots</div>
            </div>
          </div>
          <div className="soft-stat-card">
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEF0C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LayoutDashboard size={20} color="#92400E" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#92400E', lineHeight: 1 }}>{stats.reserved}</div>
              <div style={{ fontSize: 12, color: '#68736B', marginTop: 4, fontWeight: 600 }}>Reserved Slots</div>
            </div>
          </div>
          <div className="soft-stat-card">
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FCE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={20} color="#B91C1C" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#B91C1C', lineHeight: 1 }}>{stats.occupied}</div>
              <div style={{ fontSize: 12, color: '#68736B', marginTop: 4, fontWeight: 600 }}>Occupied Slots</div>
            </div>
          </div>
          <div className="soft-stat-card">
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#E8F4EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={20} color="#174C3C" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#174C3C', lineHeight: 1 }}>{todayCheckins}</div>
              <div style={{ fontSize: 12, color: '#68736B', marginTop: 4, fontWeight: 600 }}>Today's Scans</div>
            </div>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div style={{ maxWidth: 980, margin: '22px auto 0' }}>
          <div className="soft-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', borderBottom: '1.5px solid #E5EAE4', fontWeight: 700, fontSize: 14, color: '#174C3C' }}>
              Recent Check-in & Gate Activity
            </div>
            {recentBookings.length === 0 ? (
              <div style={{ padding: 36, textAlign: 'center', color: '#68736B', fontSize: 13 }}>No recent activity found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAF8', textAlign: 'left', color: '#68736B', borderBottom: '1px solid #E5EAE4' }}>
                    <th style={{ padding: '14px 22px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>Driver</th>
                    <th style={{ padding: '14px 22px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>Slot</th>
                    <th style={{ padding: '14px 22px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>Booking Time</th>
                    <th style={{ padding: '14px 22px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map(b => (
                    <tr key={b.id} style={{ borderTop: '1px solid #EEF2EF' }}>
                      <td style={{ padding: '14px 22px', fontWeight: 600, color: '#174C3C' }}>{b.user_name}</td>
                      <td style={{ padding: '14px 22px', fontWeight: 700 }}>{b.parking_slots?.slot_number}</td>
                      <td style={{ padding: '14px 22px', color: '#68736B' }}>{formatTime(b.start_time)}</td>
                      <td style={{ padding: '14px 22px' }}><StatusBadge status={b.status} small /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

    </>
  );
}
