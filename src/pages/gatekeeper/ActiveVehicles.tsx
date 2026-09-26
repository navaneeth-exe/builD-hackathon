import { useState, useEffect } from 'react';
import TopBar from '../../components/TopBar';
import StatusBadge from '../../components/StatusBadge';
import { supabase } from '../../lib/supabase';
import { fetchAllBookings, updateBookingStatus, formatTime } from '../../api';
import type { Booking } from '../../types';
import { Loader2 } from 'lucide-react';

export default function ActiveVehicles() {
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  const loadData = async () => {
    try {
      const bData = await fetchAllBookings({ status: 'CHECKED_IN' });
      setActiveBookings(bData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('active-vehicles-sync')
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

  const handleCheckout = async (id: string) => {
    setActionLoading(id);
    try {
      await updateBookingStatus(id, 'COMPLETED');
      await loadData();
    } catch (e: any) {
      alert(e.message ?? 'Checkout failed');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <>
      <TopBar title="Active Vehicles" subtitle="Currently parked vehicles on campus" />
      <div className="app-content">
        <div className="soft-card" style={{ padding: 0, overflow: 'hidden', maxWidth: 1040, margin: '0 auto' }}>
          {loading ? (
             <div style={{ padding: 48, textAlign: 'center' }}><Loader2 className="spinner" /></div>
          ) : activeBookings.length === 0 ? (
            <div style={{ padding: 56, textAlign: 'center', color: '#68736B' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#174C3C', marginBottom: 4 }}>No Vehicles Currently Checked In</div>
              <p style={{ fontSize: 12.5, color: '#68736B' }}>When drivers scan their QR code at the gate, their vehicles will display live here.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAF8', textAlign: 'left', color: '#68736B', borderBottom: '1.5px solid #E5EAE4' }}>
                  <th style={{ padding: '16px 22px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Driver & Role</th>
                  <th style={{ padding: '16px 22px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Vehicle Plate</th>
                  <th style={{ padding: '16px 22px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Assigned Spot</th>
                  <th style={{ padding: '16px 22px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Checked In At</th>
                  <th style={{ padding: '16px 22px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeBookings.map(b => (
                  <tr key={b.id} style={{ borderTop: '1px solid #EEF2EF', transition: 'background 0.15s ease' }}>
                    <td style={{ padding: '16px 22px' }}>
                      <div style={{ fontWeight: 700, color: '#174C3C', fontSize: 13.5 }}>{b.user_name}</div>
                      <div style={{ fontSize: 11.5, color: '#68736B', textTransform: 'capitalize' }}>{b.user_role}</div>
                    </td>
                    <td style={{ padding: '16px 22px', fontWeight: 700, color: '#202923', fontFamily: 'monospace', fontSize: 13 }}>
                      {b.license_plate && b.license_plate !== 'N/A' ? b.license_plate : '—'}
                    </td>
                    <td style={{ padding: '16px 22px' }}>
                      <span style={{ fontWeight: 800, marginRight: 8, color: '#174C3C' }}>{b.parking_slots?.slot_number ?? '—'}</span>
                      <StatusBadge status="CHECKED_IN" small />
                    </td>
                    <td style={{ padding: '16px 22px', color: '#68736B', fontWeight: 500 }}>
                      {formatTime(b.checked_in_at ?? b.start_time)}
                    </td>
                    <td style={{ padding: '16px 22px', textAlign: 'right' }}>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12.5, fontWeight: 700 }}
                        disabled={actionLoading === b.id}
                        onClick={() => handleCheckout(b.id)}
                      >
                        {actionLoading === b.id ? 'Processing…' : 'Gate Check Out'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

