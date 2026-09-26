import { useState, useEffect } from 'react';
import TopBar from '../../components/TopBar';
import StatusBadge from '../../components/StatusBadge';
import { fetchAllBookings, updateBookingStatus, formatTime, formatDate } from '../../api';
import type { Booking } from '../../types';
import { Loader2, Search, CalendarClock, User, LogIn, LogOut, SearchX } from 'lucide-react';

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
        
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          
          {/* Search Header */}
          <div className="soft-card" style={{ padding: '24px', borderRadius: 28, background: '#FFFFFF', marginBottom: 24, boxShadow: '0 12px 32px rgba(23,76,60,0.06)' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={20} color="#9AADA5" style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="soft-input"
                  placeholder="Search bookings by ID, driver, license plate, or slot..."
                  style={{ paddingLeft: 52, paddingRight: 20, fontSize: 15, borderRadius: 20, height: 56, border: '1px solid #EAEFEA' }}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button type="submit" className="soft-btn-primary" style={{ padding: '0 32px', borderRadius: 20, fontSize: 15, height: 56, boxShadow: '0 8px 16px rgba(23,76,60,0.1)' }}>
                Search
              </button>
              <button type="button" className="btn-secondary" style={{ padding: '0 32px', borderRadius: 20, fontSize: 15, height: 56 }} onClick={() => { setSearch(''); loadData(''); }}>
                Clear
              </button>
            </form>
          </div>

          <div className="soft-card" style={{ padding: '32px', borderRadius: 28, background: '#FFFFFF', boxShadow: '0 24px 48px rgba(23,76,60,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
               <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1A2420', letterSpacing: '-0.01em' }}>Search Results</h3>
               <div style={{ padding: '6px 12px', background: '#E3EBE6', borderRadius: 12, fontSize: 12, fontWeight: 700, color: '#174C3C' }}>
                  {bookings.length} Record{bookings.length !== 1 ? 's' : ''} Found
               </div>
            </div>

            {loading ? (
               <div style={{ padding: 48, textAlign: 'center' }}><Loader2 className="spinner" size={32} color="#174C3C" style={{ margin: '0 auto' }} /></div>
            ) : bookings.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center' }}>
                 <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F8FAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px dashed #D5DDD6' }}>
                    <SearchX size={24} color="#9AADA5" />
                 </div>
                 <div style={{ fontSize: 15, fontWeight: 700, color: '#174C3C', marginBottom: 4 }}>No Bookings Found</div>
                 <p style={{ fontSize: 13, color: '#68736B', margin: 0 }}>Adjust your search terms to find matching records.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {bookings.map(b => (
                  <div key={b.id} style={{ 
                      display: 'flex', alignItems: 'center', gap: 16, 
                      padding: '20px', background: '#F8FAF7', borderRadius: 20,
                      border: '1px solid #EAEFEA', transition: 'background 0.2s',
                  }} onMouseOver={e => e.currentTarget.style.background = '#FFFFFF'} onMouseOut={e => e.currentTarget.style.background = '#F8FAF7'}>
                      
                      <div style={{ width: 48, height: 48, borderRadius: 16, background: '#E3EBE6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <User size={24} color="#174C3C" />
                      </div>
                      
                      <div style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 16, alignItems: 'center' }}>
                          <div>
                              <div style={{ fontSize: 15, fontWeight: 800, color: '#1A2420', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.user_name}</div>
                              <div style={{ fontSize: 12, color: '#627068', marginTop: 4, fontFamily: 'monospace', fontWeight: 600 }}>
                                 {b.booking_code}
                              </div>
                          </div>

                          <div>
                              <div style={{ fontSize: 11, color: '#9AADA5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vehicle & Slot</div>
                              <div style={{ fontSize: 14, fontWeight: 800, color: '#202923', marginTop: 4 }}>
                                {b.license_plate && b.license_plate !== 'N/A' ? b.license_plate : '—'} <span style={{ color: '#9AADA5', margin: '0 4px' }}>•</span> {b.parking_slots?.slot_number ?? '—'}
                              </div>
                          </div>
                          
                          <div>
                              <div style={{ fontSize: 11, color: '#9AADA5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schedule</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                 <CalendarClock size={14} color="#174C3C" />
                                 <span style={{ fontSize: 13, fontWeight: 700, color: '#174C3C' }}>
                                   {formatDate(b.start_time).split(',')[0]}<br />
                                   <span style={{ fontSize: 11, color: '#627068' }}>{formatTime(b.start_time)} – {formatTime(b.end_time)}</span>
                                 </span>
                              </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                              <StatusBadge status={b.status} />
                          </div>
                      </div>
                      
                      <div style={{ marginLeft: 16, display: 'flex', gap: 8 }}>
                        {b.status === 'CONFIRMED' && (
                          <button 
                            className="soft-btn-primary" 
                            style={{ padding: '10px 16px', borderRadius: 14, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 16px rgba(23,76,60,0.1)' }}
                            disabled={actionLoading === b.id}
                            onClick={() => handleAction(b.id, 'CHECKED_IN')}
                          >
                            {actionLoading === b.id ? '...' : <><LogIn size={16} /> Check In</>}
                          </button>
                        )}
                        {b.status === 'CHECKED_IN' && (
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '10px 16px', borderRadius: 14, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
                            disabled={actionLoading === b.id}
                            onClick={() => handleAction(b.id, 'COMPLETED')}
                          >
                            {actionLoading === b.id ? '...' : <><LogOut size={16} /> Check Out</>}
                          </button>
                        )}
                        {b.status !== 'CONFIRMED' && b.status !== 'CHECKED_IN' && (
                          <div style={{ width: 100 }} /> /* Spacer to keep alignment */
                        )}
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
