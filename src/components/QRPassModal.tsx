import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Leaf, MapPin, Calendar, Clock, CheckCircle } from 'lucide-react';
import type { Booking } from '../types';
import StatusBadge from './StatusBadge';
import { formatDate, formatTime } from '../api';

interface QRPassModalProps {
  booking: Booking;
  onClose: () => void;
}

export default function QRPassModal({ booking, onClose }: QRPassModalProps) {
  const slot = booking.parking_slots;
  const area = slot?.parking_areas;

  return (
    <div className="modal-backdrop" style={{ 
       backgroundColor: 'rgba(23, 76, 60, 0.4)', 
       backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
       display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ 
          background: 'transparent', width: '100%', maxWidth: 420, 
          position: 'relative', display: 'flex', flexDirection: 'column', gap: 16
      }}>
        {/* Ticket Container */}
        <div style={{
           background: '#FFFFFF', borderRadius: 28, overflow: 'hidden',
           boxShadow: '0 32px 64px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,1)',
           border: '1px solid rgba(227,235,230,0.8)',
           display: 'flex', flexDirection: 'column'
        }}>
           {/* Top Section - Header & QR */}
           <div style={{ 
               padding: '32px 32px 24px 32px', background: 'linear-gradient(180deg, #F8FAF7 0%, #FFFFFF 100%)',
               display: 'flex', flexDirection: 'column', alignItems: 'center',
               position: 'relative', borderBottom: '2px dashed #E3EBE6'
           }}>
               <button
                 onClick={onClose}
                 style={{
                   position: 'absolute', top: 20, right: 20,
                   width: 32, height: 32, borderRadius: 16,
                   border: 'none', background: '#F0F4F1',
                   cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                   color: '#627068', transition: 'background 0.2s'
                 }}
                 onMouseOver={e => e.currentTarget.style.background = '#E3EBE6'}
                 onMouseOut={e => e.currentTarget.style.background = '#F0F4F1'}
               >
                 <X size={16} />
               </button>

               <div style={{ width: 48, height: 48, borderRadius: 16, background: '#C7F36B', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 8px 16px rgba(199,243,107,0.3)' }}>
                  <Leaf size={24} color="#174C3C" />
               </div>
               
               <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1A2420', letterSpacing: '-0.02em' }}>Digital Parking Pass</h3>
               <p style={{ margin: '4px 0 24px 0', fontSize: 13, color: '#627068' }}>Scan at the campus entrance</p>

               <div style={{ 
                   padding: 20, background: '#FFFFFF', borderRadius: 20,
                   border: '1px solid #E3EBE6', boxShadow: '0 12px 24px rgba(23,76,60,0.06)'
               }}>
                 <QRCodeSVG
                   value={booking.booking_code}
                   size={160}
                   fgColor="#174C3C"
                   bgColor="#ffffff"
                   level="M"
                 />
               </div>
               <div style={{ marginTop: 16, fontSize: 12, fontWeight: 700, color: '#9AADA5', letterSpacing: '0.08em' }}>ID: {booking.booking_code}</div>
           </div>

           {/* Notches for ticket effect */}
           <div style={{ position: 'relative', height: 0 }}>
               <div style={{ position: 'absolute', left: -16, top: -16, width: 32, height: 32, borderRadius: 16, background: 'rgba(23,76,60,0.4)', backdropFilter: 'blur(12px)' }} />
               <div style={{ position: 'absolute', right: -16, top: -16, width: 32, height: 32, borderRadius: 16, background: 'rgba(23,76,60,0.4)', backdropFilter: 'blur(12px)' }} />
           </div>

           {/* Bottom Section - Details */}
           <div style={{ padding: '24px 32px 32px 32px', background: '#FFFFFF' }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                   <div>
                       <div style={{ fontSize: 12, fontWeight: 700, color: '#627068', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Parking Slot</div>
                       <div style={{ fontSize: 24, fontWeight: 800, color: '#174C3C', marginTop: 4 }}>{slot?.slot_number}</div>
                   </div>
                   <div style={{ textAlign: 'right' }}>
                       <div style={{ fontSize: 12, fontWeight: 700, color: '#627068', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</div>
                       <div style={{ marginTop: 4 }}><StatusBadge status={booking.status} /></div>
                   </div>
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                   <div style={{ display: 'flex', gap: 16 }}>
                       <div style={{ flex: 1, padding: 12, background: '#F8FAF7', borderRadius: 14, border: '1px solid #EAEFEA' }}>
                           <div style={{ fontSize: 11, color: '#627068', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}><MapPin size={12}/> Area</div>
                           <div style={{ fontSize: 14, fontWeight: 700, color: '#1A2420', marginTop: 6 }}>{area?.name}</div>
                       </div>
                       <div style={{ flex: 1, padding: 12, background: '#F8FAF7', borderRadius: 14, border: '1px solid #EAEFEA' }}>
                           <div style={{ fontSize: 11, color: '#627068', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}><Calendar size={12}/> Date</div>
                           <div style={{ fontSize: 14, fontWeight: 700, color: '#1A2420', marginTop: 6 }}>{formatDate(booking.start_time)}</div>
                       </div>
                   </div>
                   
                   <div style={{ padding: 12, background: '#F8FAF7', borderRadius: 14, border: '1px solid #EAEFEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div>
                           <div style={{ fontSize: 11, color: '#627068', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}><Clock size={12}/> Duration</div>
                           <div style={{ fontSize: 14, fontWeight: 700, color: '#1A2420', marginTop: 6 }}>{formatTime(booking.start_time)} – {formatTime(booking.end_time)}</div>
                       </div>
                       <div style={{ background: '#DDF5E5', color: '#059669', padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 800 }}>
                           Free
                       </div>
                   </div>
               </div>

               <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 24, padding: 16, background: '#F0F4F1', borderRadius: 16 }}>
                   <CheckCircle size={16} color="#174C3C" style={{ marginTop: 2 }} />
                   <div style={{ fontSize: 12, color: '#1A2420', lineHeight: 1.5, fontWeight: 500 }}>
                       Keep this pass handy. You can also view it anytime from your Bookings tab.
                   </div>
               </div>
           </div>
        </div>

        {/* Floating Action */}
        <button className="soft-btn-primary" style={{ padding: '16px', borderRadius: 20, display: 'flex', justifyContent: 'center', gap: 10, boxShadow: '0 16px 32px rgba(23,76,60,0.2)' }}>
           <Download size={18} /> Save to Device
        </button>
      </div>
    </div>
  );
}
