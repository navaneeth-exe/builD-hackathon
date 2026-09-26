import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { QrCode, Search, CheckCircle, LogOut, XCircle } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function GateOperatorPortal() {
  const [scanResult, setScanResult] = useState<string>('');
  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scannerActive, setScannerActive] = useState(false);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    
    if (scannerActive) {
      scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      
      scanner.render(
        (decodedText) => {
          setScanResult(decodedText);
          setScannerActive(false);
          scanner?.clear();
          fetchReservation(decodedText);
        },
        () => {
          // ignore background scan errors
        }
      );
    }

    return () => {
      scanner?.clear();
    };
  }, [scannerActive]);

  const fetchReservation = async (token: string) => {
    if (!token) return;
    setLoading(true);
    setError('');
    setReservation(null);
    
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*, slots(slot_number)')
        .eq('qr_token', token)
        .single();
        
      if (error || !data) {
        setError('Invalid QR Code or Reservation not found');
      } else {
        setReservation(data);
      }
    } catch (err: any) {
      setError('Failed to fetch reservation details');
    }
    setLoading(false);
  };

  const updateStatus = async (newStatus: string) => {
    if (!reservation) return;
    setLoading(true);
    
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'CHECKED_IN') updateData.checked_in_at = new Date().toISOString();
      if (newStatus === 'COMPLETED') updateData.checked_out_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('reservations')
        .update(updateData)
        .eq('id', reservation.id);
        
      if (error) throw error;
      
      // Update local state
      setReservation({ ...reservation, ...updateData });
      
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gate Operator Portal</h1>
            <p className="text-gray-500 text-sm">Scan QR codes to check vehicles in or out</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <QrCode className="w-6 h-6" />
          </div>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Scanner Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">QR Scanner</h2>
            
            {!scannerActive ? (
              <button 
                onClick={() => setScannerActive(true)}
                className="w-full py-8 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 transition"
              >
                <QrCode className="w-12 h-12 mb-2" />
                <span>Start Camera Scanner</span>
              </button>
            ) : (
              <div id="reader" className="rounded-xl overflow-hidden mb-4"></div>
            )}
            
            <div className="mt-6 flex items-center gap-2">
              <div className="h-px bg-gray-200 flex-1"></div>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">or enter manually</span>
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>
            
            <form 
              onSubmit={(e) => { e.preventDefault(); fetchReservation(scanResult); }}
              className="mt-6 flex gap-2"
            >
              <input 
                type="text" 
                value={scanResult} 
                onChange={(e) => setScanResult(e.target.value)} 
                placeholder="Enter QR Token"
                className="flex-1 p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg shadow-sm transition">
                <Search className="w-5 h-5" />
              </button>
            </form>
          </div>

          {/* Result Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <h2 className="text-lg font-semibold mb-4">Reservation Details</h2>
            
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center text-red-500 bg-red-50 rounded-xl p-6 border border-red-100">
                <XCircle className="w-12 h-12 mb-2" />
                <p className="font-medium text-center">{error}</p>
              </div>
            ) : reservation ? (
              <div className="flex-1 flex flex-col">
                <div className="bg-gray-50 rounded-xl p-5 mb-6 border border-gray-100 space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="text-gray-500">Status</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      reservation.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' : 
                      reservation.status === 'CHECKED_IN' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {reservation.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name:</span>
                    <span className="font-semibold text-gray-900">{reservation.user_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">License Plate:</span>
                    <span className="font-bold text-gray-900 bg-yellow-100 px-2 py-0.5 rounded text-sm tracking-wider">{reservation.license_plate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Slot:</span>
                    <span className="font-semibold text-blue-600 text-lg">{reservation.slots?.slot_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Valid Until:</span>
                    <span className="font-medium text-gray-700">{new Date(reservation.end_time).toLocaleTimeString()}</span>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-gray-100 flex gap-3">
                  {reservation.status === 'CONFIRMED' && (
                    <button 
                      onClick={() => updateStatus('CHECKED_IN')}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition shadow-sm"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Check In Vehicle
                    </button>
                  )}
                  {reservation.status === 'CHECKED_IN' && (
                    <button 
                      onClick={() => updateStatus('COMPLETED')}
                      className="flex-1 bg-gray-800 hover:bg-gray-900 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition shadow-sm"
                    >
                      <LogOut className="w-5 h-5" />
                      Check Out Vehicle
                    </button>
                  )}
                  {reservation.status === 'COMPLETED' && (
                    <div className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-xl font-medium flex items-center justify-center gap-2">
                      Completed
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl p-6 border border-gray-100 border-dashed">
                <Search className="w-12 h-12 mb-3 text-gray-300" />
                <p className="text-center text-sm">Scan a QR code or enter token to view reservation details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
