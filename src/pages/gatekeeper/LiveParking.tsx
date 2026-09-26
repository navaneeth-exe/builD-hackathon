import { useState, useEffect } from 'react';
import TopBar from '../../components/TopBar';
import { supabase } from '../../lib/supabase';
import { fetchAllBookings, formatTime } from '../../api';
import type { Booking } from '../../types';
import { Loader2 } from 'lucide-react';

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
    if (!slot.is_active) return { status: 'UNAVAILABLE', color: '#E8EBE8', text: '#68736B' };
    
    // Check if slot has a CHECKED_IN booking currently
    const activeBooking = bookings.find(b => b.slot_id === slot.id && b.status === 'CHECKED_IN');
    if (activeBooking) return { status: 'OCCUPIED', color: '#FCE2E2', text: '#B91C1C', booking: activeBooking };
    
    // Check if slot has any active or upcoming CONFIRMED reservation
    const now = new Date().getTime();
    // Prioritize currently active or upcoming CONFIRMED booking
    const activeOrUpcoming = bookings
      .filter(b => b.slot_id === slot.id && b.status === 'CONFIRMED' && new Date(b.end_time).getTime() > now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    if (activeOrUpcoming.length > 0) {
      const reservedBooking = activeOrUpcoming[0];
      return { status: 'RESERVED', color: '#FEF0C7', text: '#92400E', booking: reservedBooking };
    }
    
    return { status: 'AVAILABLE', color: '#DDF5E5', text: '#065F46' };
  };

  return (
    <>
      <TopBar title="Live Parking" subtitle="Monitor real-time slot occupancy and reservations" />
      <div className="app-content">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Loader2 className="spinner" /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 16 }}>
            {slots.map(slot => {
              const { status, color, text, booking } = getSlotStatus(slot);
              return (
                <div
                  key={slot.id}
                  className="soft-card"
                  style={{
                    padding: '18px 16px',
                    background: color,
                    borderColor: 'rgba(0,0,0,0.06)',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 140,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: text }}>{slot.slot_number}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: text, opacity: 0.9, marginTop: 4, letterSpacing: '0.04em' }}>{status}</div>
                  </div>
                  {booking && (
                    <div style={{ marginTop: 12, fontSize: 11, fontWeight: 600, color: text, background: 'rgba(255,255,255,0.7)', padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.8)' }}>
                      {booking.license_plate && booking.license_plate !== 'N/A' && (
                        <div style={{ fontWeight: 800, marginBottom: 2, fontFamily: 'monospace' }}>{booking.license_plate}</div>
                      )}
                      <div style={{ fontSize: 10.5, opacity: 0.85 }}>
                        {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                      </div>
                      <div style={{ fontSize: 10, opacity: 0.75, marginTop: 2, fontWeight: 500 }}>
                        {booking.user_name}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </>
  );
}
