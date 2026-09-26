import { useState, useEffect } from 'react';
import TopBar from '../../components/TopBar';
import { supabase } from '../../lib/supabase';
import { fetchAllBookings } from '../../api';
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
  }, []);

  const getSlotStatus = (slot: Slot) => {
    if (!slot.is_active) return { status: 'UNAVAILABLE', color: '#E8EBE8', text: '#68736B' };
    
    // Check if slot has a CHECKED_IN booking
    const activeBooking = bookings.find(b => b.slot_id === slot.id && b.status === 'CHECKED_IN');
    if (activeBooking) return { status: 'OCCUPIED', color: '#FCE2E2', text: '#B91C1C', booking: activeBooking };
    
    // Check if slot has a CONFIRMED booking starting soon or right now
    const now = new Date().getTime();
    const reservedBooking = bookings.find(b => {
      if (b.slot_id !== slot.id) return false;
      if (b.status !== 'CONFIRMED') return false;
      const start = new Date(b.start_time).getTime();
      const end = new Date(b.end_time).getTime();
      return now >= start - 1000 * 60 * 60 && now <= end; // active or starting within 1 hr
    });
    
    if (reservedBooking) return { status: 'RESERVED', color: '#FEF0C7', text: '#92400E', booking: reservedBooking };
    
    return { status: 'AVAILABLE', color: '#DDF5E5', text: '#065F46' };
  };

  return (
    <>
      <TopBar title="Live Parking" subtitle="Monitor real-time slot occupancy" />
      <div className="app-content">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 className="spinner" /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16 }}>
            {slots.map(slot => {
              const { status, color, text, booking } = getSlotStatus(slot);
              return (
                <div key={slot.id} className="ps-card" style={{ padding: 16, background: color, borderColor: 'rgba(0,0,0,0.05)', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: text }}>{slot.slot_number}</div>
                  <div style={{ fontSize: 11, color: text, opacity: 0.8, marginTop: 4 }}>{status}</div>
                  {booking && (
                    <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: text, background: 'rgba(255,255,255,0.4)', padding: '4px', borderRadius: 4 }}>
                      {booking.license_plate}
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
