import { useState, useEffect } from 'react';
import TopBar from '../../components/TopBar';
import StatusBadge from '../../components/StatusBadge';
import { fetchAllBookings, updateBookingStatus, formatTime, formatDate } from '../../api';
import type { Booking } from '../../types';
import { Loader2, Search } from 'lucide-react';

export default function BookingLookup() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  const loadData = async (query = '') => {
    setLoading(true);
    try {
      const bData = await fetchAllBookings({ search: query });
      setBookings(bData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(search);
  };

  const handleAction = async (id: string, status: 'CHECKED_IN' | 'COMPLETED') => {
    setActionLoading(id);
    try {
      await updateBookingStatus(id, status);
      await loadData(search);
    } catch (e: any) {
      alert(e.message ?? 'Action failed');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <>
      <TopBar title="Booking Lookup" subtitle="Search by Booking ID, User Name, or Slot" />
      <div className="app-content">
        
        <div style={{ maxWidth: 1000, margin: '0 auto 24px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={18} color="#9CA3AF" style={{ position: 'absolute', left: 14, top: 11 }} />
              <input
                type="text"
                className="ps-input"
                placeholder="Search bookings..."
                style={{ paddingLeft: 40 }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '0 24px' }}>
              Search
            </button>
            <button type="button" className="btn-secondary" onClick={() => { setSearch(''); loadData(''); }}>
              Clear
            </button>
          </form>
        </div>

        <div className="ps-card" style={{ padding: 0, overflow: 'hidden', maxWidth: 1000, margin: '0 auto' }}>
          {loading ? (
             <div style={{ padding: 40, textAlign: 'center' }}><Loader2 className="spinner" /></div>
          ) : bookings.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#68736B' }}>No bookings found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F7F8F4', textAlign: 'left', color: '#68736B' }}>
                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Booking ID</th>
                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>User / Plate</th>
                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Slot</th>
                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Date & Time</th>
                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Status</th>
                    <th style={{ padding: '14px 20px', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id} style={{ borderTop: '1px solid #E5EAE4' }}>
                      <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontWeight: 600 }}>{b.booking_code}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 600, color: '#202923' }}>{b.user_name}</div>
                        <div style={{ fontSize: 11, color: '#68736B' }}>{b.license_plate}</div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 600 }}>{b.parking_slots?.slot_number}</div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div>{formatDate(b.start_time)}</div>
                        <div style={{ fontSize: 11, color: '#68736B' }}>{formatTime(b.start_time)} - {formatTime(b.end_time)}</div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <StatusBadge status={b.status} />
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        {b.status === 'CONFIRMED' && (
                          <button 
                            className="btn-primary" 
                            disabled={actionLoading === b.id}
                            onClick={() => handleAction(b.id, 'CHECKED_IN')}
                            style={{ padding: '6px 12px', fontSize: 12 }}
                          >
                            {actionLoading === b.id ? '...' : 'Check In'}
                          </button>
                        )}
                        {b.status === 'CHECKED_IN' && (
                          <button 
                            className="btn-secondary" 
                            disabled={actionLoading === b.id}
                            onClick={() => handleAction(b.id, 'COMPLETED')}
                            style={{ padding: '6px 12px', fontSize: 12 }}
                          >
                            {actionLoading === b.id ? '...' : 'Check Out'}
                          </button>
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
    </>
  );
}
