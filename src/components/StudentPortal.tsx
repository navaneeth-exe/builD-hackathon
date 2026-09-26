import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CarFront, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface Slot {
  id: string;
  lot_id: string;
  slot_number: string;
  slot_type: string;
  is_active: boolean;
}

interface Reservation {
  id: string;
  slot_id: string;
  status: string;
  start_time: string;
  end_time: string;
}

export default function StudentPortal() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [activeReservations, setActiveReservations] = useState<Reservation[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [userType, setUserType] = useState('student');
  const [licensePlate, setLicensePlate] = useState('');
  const [durationHours, setDurationHours] = useState(2);
  const [booking, setBooking] = useState(false);
  const [bookedData, setBookedData] = useState<any>(null);

  useEffect(() => {
    fetchSlots();
    
    // Subscribe to realtime changes
    const resSubscription = supabase.channel('reservations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, fetchSlots)
      .subscribe();
      
    return () => {
      supabase.removeChannel(resSubscription);
    };
  }, []);

  const fetchSlots = async () => {
    const { data: slotsData } = await supabase.from('slots').select('*').eq('is_active', true);
    const { data: resData } = await supabase.from('reservations').select('*').in('status', ['CONFIRMED', 'CHECKED_IN']);
    
    if (slotsData) setSlots(slotsData);
    if (resData) setActiveReservations(resData);
  };

  const getSlotStatus = (slotId: string) => {
    const now = new Date().toISOString();
    const isOccupied = activeReservations.some(r => r.slot_id === slotId && r.start_time <= now && r.end_time >= now);
    return isOccupied ? 'occupied' : 'available';
  };

  const handleBookSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    
    setBooking(true);
    
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);
    const referenceCode = `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const qrToken = `QR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    
    try {
      const { data, error } = await supabase.rpc('book_parking_slot', {
        p_slot_id: selectedSlot.id,
        p_user_name: name,
        p_user_type: userType,
        p_license_plate: licensePlate.toUpperCase(),
        p_start_time: startTime.toISOString(),
        p_end_time: endTime.toISOString(),
        p_reference_code: referenceCode,
        p_qr_token: qrToken
      });

      if (error) {
        alert(error.message);
        setBooking(false);
        return;
      }

      setBookedData({
        ...data,
        qrToken,
        licensePlate,
        slotNumber: selectedSlot.slot_number,
        endTime
      });
      fetchSlots();
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    }
    setBooking(false);
  };

  if (bookedData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-500 mb-6">Slot {bookedData.slotNumber} reserved successfully</p>
          
          <div className="bg-blue-50 p-6 rounded-xl mb-6 flex flex-col items-center">
            <div className="bg-white p-4 rounded-lg shadow-sm mb-4 inline-block">
              <QRCodeSVG value={bookedData.qrToken} size={200} />
            </div>
            <p className="text-sm text-gray-500 font-medium">Show this QR code at the gate</p>
          </div>
          
          <div className="text-left bg-gray-50 rounded-lg p-4 space-y-2 text-sm border border-gray-100">
            <div className="flex justify-between"><span className="text-gray-500">License Plate:</span><span className="font-semibold">{bookedData.licensePlate}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Reference:</span><span className="font-semibold">{bookedData.referenceCode}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Valid Until:</span><span className="font-semibold">{bookedData.endTime.toLocaleTimeString()}</span></div>
          </div>
          
          <button onClick={() => { setBookedData(null); setSelectedSlot(null); }} className="mt-6 w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition">
            Book Another Slot
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Student Portal</h1>
          <p className="text-gray-500">Select an available parking slot to book</p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Map View */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <CarFront className="w-5 h-5 text-blue-500" />
              Parking Layout
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {slots.sort((a, b) => a.slot_number.localeCompare(b.slot_number)).map(slot => {
                const status = getSlotStatus(slot.id);
                const isSelected = selectedSlot?.id === slot.id;
                
                return (
                  <button
                    key={slot.id}
                    onClick={() => status === 'available' && setSelectedSlot(slot)}
                    disabled={status === 'occupied'}
                    className={`
                      relative p-4 rounded-xl flex flex-col items-center justify-center min-h-[100px] border-2 transition-all
                      ${status === 'occupied' ? 'bg-red-50 border-red-100 cursor-not-allowed opacity-60' : 
                        isSelected ? 'bg-blue-50 border-blue-500 shadow-md transform scale-105' : 
                        'bg-white border-green-200 hover:border-green-400 hover:shadow-sm'}
                    `}
                  >
                    <span className={`font-bold text-lg ${status === 'occupied' ? 'text-red-700' : isSelected ? 'text-blue-700' : 'text-green-700'}`}>
                      {slot.slot_number}
                    </span>
                    <span className="text-xs text-gray-500 capitalize mt-1">{status}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Booking Form */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Booking Details
            </h2>
            
            {selectedSlot ? (
              <form onSubmit={handleBookSlot} className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-6 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Selected Slot</p>
                    <p className="text-2xl font-bold text-blue-900">{selectedSlot.slot_number}</p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-300" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="John Doe" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                    <select value={userType} onChange={e => setUserType(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                      <option value="student">Student</option>
                      <option value="staff">Staff</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                    <input type="text" required value={licensePlate} onChange={e => setLicensePlate(e.target.value.toUpperCase())} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none uppercase" placeholder="ABC-1234" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Hours)</label>
                  <input type="number" min="1" max="12" required value={durationHours} onChange={e => setDurationHours(parseInt(e.target.value))} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                
                <button type="submit" disabled={booking} className="w-full py-4 mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition disabled:opacity-70 flex justify-center items-center gap-2">
                  {booking ? 'Confirming...' : 'Confirm Booking'}
                </button>
              </form>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center px-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <CarFront className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500">Please select an available parking slot from the layout to begin your booking.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
