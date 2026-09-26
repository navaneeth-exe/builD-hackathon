import { useState, useEffect } from 'react';
import TopBar from '../../components/TopBar';
import { supabase } from '../../lib/supabase';
import { fetchAllBookings, formatTime } from '../../api';
import type { Booking } from '../../types';
import { Loader2, Car, CalendarClock } from 'lucide-react';

interface Slot {
  id: string;
  lot_id: string;
  slot_number: string;
  slot_type: string;
  is_active: boolean;
  lots: { name: string };
}

export default function LiveParking() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const { data: slotsData, error } = await supabase
        .from('slots')
        .select('*, lots(name)')
        .order('slot_number');
        
      if (error) throw error;
      
      const bData = await fetchAllBookings();
      
      setSlots(slotsData as any);
      setBookings(bData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to real-time reservation and slot changes
    const channel = supabase
      .channel('live-parking-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slots' }, () => {
        loadData();
      })
      .subscribe();

    const interval = setInterval(loadData, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const getSlotStatus = (slot: Slot) => {
    if (!slot.is_active) return { status: 'UNAVAILABLE', bg: '#F8FAF7', border: '#EAEFEA', color: '#9AADA5', icon: null };
    
    // Check if slot has a CHECKED_IN booking currently
    const activeBooking = bookings.find(b => b.slot_id === slot.id && b.status === 'CHECKED_IN');
    if (activeBooking) return { status: 'OCCUPIED', bg: '#FEE2E2', border: '#FCA5A5', color: '#991B1B', booking: activeBooking, icon: <Car size={16} /> };
    
    // Check if slot has any active or upcoming CONFIRMED reservation
    const now = new Date().getTime();
    const activeOrUpcoming = bookings
      .filter(b => b.slot_id === slot.id && b.status === 'CONFIRMED' && new Date(b.end_time).getTime() > now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    if (activeOrUpcoming.length > 0) {
      const reservedBooking = activeOrUpcoming[0];
      return { status: 'RESERVED', bg: '#FEF0C7', border: '#FDE047', color: '#92400E', booking: reservedBooking, icon: <CalendarClock size={16} /> };
    }
    
    return { status: 'AVAILABLE', bg: '#DDF5E5', border: '#A7E8BC', color: '#065F46', icon: null };
  };

  return (
    <>
      <TopBar title="Live Parking Map" subtitle="Monitor real-time slot occupancy across the campus" />
      <div className="app-content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)' }}>
        
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
             <div className="soft-card" style={{ padding: 48, borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                 <Loader2 className="spinner" size={32} color="#174C3C" />
                 <div style={{ fontSize: 14, fontWeight: 700, color: '#174C3C' }}>Syncing live campus data…</div>
             </div>
          </div>
        ) : (
          <div style={{ 
              flex: 1, position: 'relative', borderRadius: 32, overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(23,76,60,0.1), inset 0 8px 24px rgba(255,255,255,1)', 
              background: '#EAEFEA'
          }}>
            
            <div style={{
                position: 'absolute', inset: 0, 
                backgroundImage: 'url(/campus-bg.jpg)',
                backgroundSize: 'cover', backgroundPosition: 'center',
                opacity: 0.6, mixBlendMode: 'multiply'
            }} />

            <div style={{
                position: 'absolute', inset: 0, padding: '40px', overflowY: 'auto',
                display: 'flex', justifyContent: 'center', alignItems: 'flex-start'
            }}>
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 160px))', 
                    gap: 16, maxWidth: 1200, width: '100%', justifyContent: 'center',
                    perspective: '1200px'
                }}>
                  {slots.map(slot => {
                    const { status, bg, border, color, booking, icon } = getSlotStatus(slot);
                    return (
                      <div
                        key={slot.id}
                        style={{
                          background: 'rgba(255,255,255,0.95)',
                          backdropFilter: 'blur(12px)',
                          borderRadius: 20,
                          padding: '16px',
                          border: `2px solid ${border}`,
                          boxShadow: `0 12px 24px rgba(0,0,0,0.06), inset 0 0 0 2px ${bg}`,
                          display: 'flex', flexDirection: 'column',
                          minHeight: 160,
                          transform: 'translateZ(0)',
                          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s',
                          cursor: 'default'
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                          e.currentTarget.style.boxShadow = `0 24px 48px rgba(0,0,0,0.1), inset 0 0 0 2px ${bg}`;
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.transform = 'translateZ(0)';
                          e.currentTarget.style.boxShadow = `0 12px 24px rgba(0,0,0,0.06), inset 0 0 0 2px ${bg}`;
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                           <div style={{ fontSize: 24, fontWeight: 800, color: '#1A2420' }}>{slot.slot_number}</div>
                           {icon && <div style={{ color }}>{icon}</div>}
                        </div>
                        
                        <div style={{ 
                            fontSize: 10, fontWeight: 800, color, 
                            textTransform: 'uppercase', letterSpacing: '0.08em',
                            padding: '4px 8px', background: bg, borderRadius: 8, display: 'inline-block', alignSelf: 'flex-start'
                        }}>
                           {status}
                        </div>

                        <div style={{ flex: 1 }} />

                        {booking && (
                          <div style={{ marginTop: 12, borderTop: '1px dashed #EAEFEA', paddingTop: 12 }}>
                            {booking.license_plate && booking.license_plate !== 'N/A' && (
                              <div style={{ fontSize: 13, fontWeight: 800, color: '#1A2420', fontFamily: 'monospace', marginBottom: 4 }}>{booking.license_plate}</div>
                            )}
                            <div style={{ fontSize: 11, color: '#627068', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {booking.user_name}
                            </div>
                            <div style={{ fontSize: 10.5, color: '#9AADA5', marginTop: 2 }}>
                              {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
