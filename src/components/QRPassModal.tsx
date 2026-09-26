import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Leaf } from 'lucide-react';
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
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#F7F8F4', borderRadius: 16, padding: 20, width: '100%', maxWidth: 460, position: 'relative' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 28, height: 28, borderRadius: 6,
            border: '1px solid #E5EAE4', background: '#fff',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#68736B',
          }}
        >
          <X size={14} />
        </button>

        <div style={{ fontSize: 12, fontWeight: 700, color: '#68736B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
          Parking Pass
        </div>
        <p style={{ fontSize: 12.5, color: '#68736B', marginBottom: 16 }}>
          Show this QR code at the entrance for check-in
        </p>

        <div className="qr-pass">
          {/* Header */}
          <div className="qr-pass-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 6,
                background: '#C7F36B',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Leaf size={14} color="#174C3C" />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.1 }}>ParkSync</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9.5 }}>Campus Parking System</div>
              </div>
            </div>
            <StatusBadge status={booking.status} />
          </div>

          {/* QR code body */}
          <div className="qr-pass-body">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{
                padding: 16, background: '#fff',
                border: '1px solid #E5EAE4', borderRadius: 12,
                display: 'inline-block',
              }}>
                <QRCodeSVG
                  value={booking.booking_code}
                  size={148}
                  fgColor="#174C3C"
                  bgColor="#ffffff"
                  level="M"
                />
              </div>
            </div>

            {/* Slot number */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#202923' }}>{slot?.slot_number}</div>
              <div style={{ fontSize: 13, color: '#68736B' }}>{area?.name}</div>
            </div>

            {/* Details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 16 }}>
              {[
                { label: 'Date', value: formatDate(booking.start_time) },
                { label: 'Booking ID', value: booking.booking_code },
                { label: 'Start Time', value: formatTime(booking.start_time) },
                { label: 'End Time', value: formatTime(booking.end_time) },
                { label: 'Slot Type', value: slot?.slot_type ?? '—' },
                { label: 'Near Entrance', value: '2 min walk' },
              ].map(r => (
                <div key={r.label}>
                  <div style={{ fontSize: 10.5, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {r.label}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#202923', marginTop: 1 }}>{r.value}</div>
                </div>
              ))}
            </div>

            <div style={{
              padding: '10px 12px',
              background: '#F7FBF8', border: '1px solid #DDF5E5', borderRadius: 8,
              fontSize: 12, color: '#065F46', marginBottom: 14,
            }}>
              📱 Show this QR code at the entrance and exit.<br />
              Keep your booking active during the reserved time.
            </div>
          </div>
        </div>

        <button
          className="btn-secondary"
          style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}
        >
          <Download size={13} /> Download QR Code
        </button>
      </div>
    </div>
  );
}
