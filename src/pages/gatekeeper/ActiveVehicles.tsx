import { useState, useEffect } from 'react';
import TopBar from '../../components/TopBar';
import StatusBadge from '../../components/StatusBadge';
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
      <TopBar title="Active Vehicles" subtitle="Currently parked vehicles" />
      <div className="app-content">
        <div className="ps-card" style={{ padding: 0, overflow: 'hidden', maxWidth: 1000, margin: '0 auto' }}>
          {loading ? (
             <div style={{ padding: 40, textAlign: 'center' }}><Loader2 className="spinner" /></div>
          ) : activeBookings.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#68736B' }}>No vehicles currently checked in.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F7F8F4', textAlign: 'left', color: '#68736B' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 500 }}>User & Role</th>
                  <th style={{ padding: '14px 20px', fontWeight: 500 }}>Plate No.</th>
                  <th style={{ padding: '14px 20px', fontWeight: 500 }}>Slot</th>
                  <th style={{ padding: '14px 20px', fontWeight: 500 }}>Checked In</th>
                  <th style={{ padding: '14px 20px', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeBookings.map(b => (
                  <tr key={b.id} style={{ borderTop: '1px solid #E5EAE4' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 600, color: '#202923' }}>{b.user_name}</div>
                      <div style={{ fontSize: 11, color: '#68736B' }}>{b.user_role}</div>
                    </td>
                    <td style={{ padding: '14px 20px', fontWeight: 600 }}>{b.license_plate}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <StatusBadge status="CHECKED_IN" label={b.parking_slots?.slot_number ?? ''} />
                    </td>
                    <td style={{ padding: '14px 20px', color: '#68736B' }}>{formatTime(b.checked_in_at ?? b.start_time)}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <button 
                        className="btn-secondary" 
                        disabled={actionLoading === b.id}
                        onClick={() => handleCheckout(b.id)}
                      >
                        {actionLoading === b.id ? '...' : 'Check Out'}
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
