import { useState, useEffect } from 'react';
import TopBar from '../../components/TopBar';
import StatusBadge from '../../components/StatusBadge';
import { supabase } from '../../lib/supabase';
import { fetchAllBookings, updateBookingStatus, formatTime } from '../../api';
import type { Booking } from '../../types';
import { Loader2, Car, MapPin, User, LogOut } from 'lucide-react';

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
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 16px' }}>
          <div className="soft-card" style={{ padding: '32px', borderRadius: 28, background: '#FFFFFF', boxShadow: '0 24px 48px rgba(23,76,60,0.04)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
               <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1A2420', letterSpacing: '-0.01em' }}>Currently Checked In</h3>
               <div style={{ padding: '6px 12px', background: '#E3EBE6', borderRadius: 12, fontSize: 12, fontWeight: 700, color: '#174C3C' }}>
                  {activeBookings.length} Vehicle{activeBookings.length !== 1 ? 's' : ''}
               </div>
            </div>

            {loading ? (
               <div style={{ padding: 48, textAlign: 'center' }}><Loader2 className="spinner" size={32} color="#174C3C" style={{ margin: '0 auto' }} /></div>
            ) : activeBookings.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center' }}>
                 <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F8FAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px dashed #D5DDD6' }}>
                    <Car size={24} color="#9AADA5" />
                 </div>
                 <div style={{ fontSize: 15, fontWeight: 700, color: '#174C3C', marginBottom: 4 }}>No Vehicles Checked In</div>
                 <p style={{ fontSize: 13, color: '#68736B', margin: 0 }}>Vehicles will appear here once drivers scan in at the gate.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeBookings.map(b => (
                  <div key={b.id} style={{ 
                      display: 'flex', alignItems: 'center', gap: 16, 
                      padding: '20px', background: '#F8FAF7', borderRadius: 20,
                      border: '1px solid #EAEFEA', transition: 'background 0.2s',
                  }} onMouseOver={e => e.currentTarget.style.background = '#FFFFFF'} onMouseOut={e => e.currentTarget.style.background = '#F8FAF7'}>
                      
                      {/* Driver Avatar */}
                      <div style={{ width: 48, height: 48, borderRadius: 16, background: '#E3EBE6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <User size={24} color="#174C3C" />
                      </div>
                      
                      {/* Details Grid */}
                      <div style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 16, alignItems: 'center' }}>
                          <div>
                              <div style={{ fontSize: 15, fontWeight: 800, color: '#1A2420', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.user_name}</div>
                              <div style={{ fontSize: 12, color: '#627068', marginTop: 4, textTransform: 'capitalize', fontWeight: 600 }}>
                                 {b.user_role}
                              </div>
                          </div>

                          <div>
                              <div style={{ fontSize: 11, color: '#9AADA5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vehicle Plate</div>
                              <div style={{ fontSize: 14, fontWeight: 800, color: '#202923', marginTop: 4, fontFamily: 'monospace' }}>
                                {b.license_plate && b.license_plate !== 'N/A' ? b.license_plate : '—'}
                              </div>
                          </div>
                          
                          <div>
                              <div style={{ fontSize: 11, color: '#9AADA5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Slot</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                 <MapPin size={14} color="#174C3C" />
                                 <span style={{ fontSize: 14, fontWeight: 800, color: '#174C3C' }}>{b.parking_slots?.slot_number ?? '—'}</span>
                              </div>
                          </div>

                          <div>
                              <div style={{ fontSize: 11, color: '#9AADA5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Checked In</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#1A2420', marginTop: 4 }}>
                                {formatTime(b.checked_in_at ?? b.start_time)}
                              </div>
                          </div>
                      </div>
                      
                      {/* Action */}
                      <div style={{ marginLeft: 16 }}>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '10px 16px', borderRadius: 14, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
                          disabled={actionLoading === b.id}
                          onClick={() => handleCheckout(b.id)}
                        >
                          {actionLoading === b.id ? 'Processing…' : <><LogOut size={16} /> Check Out</>}
                        </button>
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

