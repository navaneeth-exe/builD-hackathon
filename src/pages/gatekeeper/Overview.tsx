import { useState, useEffect } from 'react';
import { CheckCircle, QrCode, LayoutDashboard } from 'lucide-react';
import TopBar from '../../components/TopBar';
import StatusBadge from '../../components/StatusBadge';
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
    // In a real app we might set an interval here
  }, []);

  return (
    <>
      <TopBar title="Overview" subtitle="Gatekeeper Dashboard" />
      <div className="app-content">
        
        {/* Dashboard Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24, maxWidth: 960, margin: '0 auto 24px' }}>
          <div className="stat-card">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LayoutDashboard size={20} color="#202923" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#202923', lineHeight: 1 }}>{stats.total}</div>
              <div style={{ fontSize: 12, color: '#68736B', marginTop: 4 }}>Total Slots</div>
            </div>
          </div>
          <div className="stat-card">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#DDF5E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={20} color="#065F46" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#202923', lineHeight: 1 }}>{stats.available}</div>
              <div style={{ fontSize: 12, color: '#68736B', marginTop: 4 }}>Available Slots</div>
            </div>
          </div>
          <div className="stat-card">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEF0C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LayoutDashboard size={20} color="#92400E" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#202923', lineHeight: 1 }}>{stats.reserved}</div>
              <div style={{ fontSize: 12, color: '#68736B', marginTop: 4 }}>Reserved Slots</div>
            </div>
          </div>
          <div className="stat-card">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FCE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={20} color="#B91C1C" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#202923', lineHeight: 1 }}>{stats.occupied}</div>
              <div style={{ fontSize: 12, color: '#68736B', marginTop: 4 }}>Occupied Slots</div>
            </div>
          </div>
          <div className="stat-card">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#E8F4EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={20} color="#174C3C" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#202923', lineHeight: 1 }}>{todayCheckins}</div>
              <div style={{ fontSize: 12, color: '#68736B', marginTop: 4 }}>Today's Check-ins</div>
            </div>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div style={{ maxWidth: 960, margin: '24px auto 0' }}>
          <div className="ps-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5EAE4', fontWeight: 600, fontSize: 14 }}>
              Recent Check-in / Check-out Activity
            </div>
            {recentBookings.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#68736B', fontSize: 13 }}>No recent activity found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F7F8F4', textAlign: 'left', color: '#68736B' }}>
                    <th style={{ padding: '12px 20px', fontWeight: 500 }}>User</th>
                    <th style={{ padding: '12px 20px', fontWeight: 500 }}>Slot</th>
                    <th style={{ padding: '12px 20px', fontWeight: 500 }}>Time</th>
                    <th style={{ padding: '12px 20px', fontWeight: 500 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map(b => (
                    <tr key={b.id} style={{ borderTop: '1px solid #E5EAE4' }}>
                      <td style={{ padding: '12px 20px', fontWeight: 500 }}>{b.user_name}</td>
                      <td style={{ padding: '12px 20px' }}>{b.parking_slots?.slot_number}</td>
                      <td style={{ padding: '12px 20px', color: '#68736B' }}>{formatTime(b.start_time)}</td>
                      <td style={{ padding: '12px 20px' }}><StatusBadge status={b.status} /></td>
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
