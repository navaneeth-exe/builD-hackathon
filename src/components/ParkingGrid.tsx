import { useState } from 'react';
import type { SlotWithStatus } from '../types';

interface ParkingGridProps {
  slots: SlotWithStatus[];
  selectedSlotId?: string | null;
  onSlotClick?: (slot: SlotWithStatus) => void;
  compact?: boolean;
}

function groupByRow(slots: SlotWithStatus[]) {
  const map = new Map<string, SlotWithStatus[]>();
  for (const slot of slots) {
    const parts = slot.slot_number.split('-');
    const row = parts[0];
    if (!map.has(row)) map.set(row, []);
    map.get(row)!.push(slot);
  }
  return map;
}

function getCarColor(id: string) {
  const colors = ['#E2E8F0', '#1E293B', '#DC2626', '#1D4ED8', '#047857', '#B91C1C', '#475569'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Vertical top-view car silhouette SVG
function CarSilhouette({ color, size = 32 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size * 1.8} viewBox="0 0 22 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Wheels */}
      <rect x="2" y="6" width="3" height="6" rx="1.5" fill="#1A2420" opacity="0.8" />
      <rect x="17" y="6" width="3" height="6" rx="1.5" fill="#1A2420" opacity="0.8" />
      <rect x="2" y="28" width="3" height="6" rx="1.5" fill="#1A2420" opacity="0.8" />
      <rect x="17" y="28" width="3" height="6" rx="1.5" fill="#1A2420" opacity="0.8" />
      {/* Car body */}
      <rect x="4" y="2" width="14" height="36" rx="5" fill={color} opacity="0.9" />
      {/* Cabin roof */}
      <rect x="5.5" y="10" width="11" height="18" rx="4" fill={color} opacity="0.6" />
      {/* Windshields */}
      <rect x="6.5" y="11" width="9" height="5" rx="2" fill="white" opacity="0.3" />
      <rect x="6.5" y="22" width="9" height="5" rx="2" fill="white" opacity="0.3" />
      {/* Headlights & Taillights */}
      <rect x="5" y="3" width="3" height="2" rx="1" fill="#FEF08A" opacity="0.9" />
      <rect x="14" y="3" width="3" height="2" rx="1" fill="#FEF08A" opacity="0.9" />
      <rect x="5" y="35" width="3" height="2" rx="1" fill="#EF4444" opacity="0.8" />
      <rect x="14" y="35" width="3" height="2" rx="1" fill="#EF4444" opacity="0.8" />
    </svg>
  );
}

function EVIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 10 13" fill="none">
      <path d="M6 1L1 8h4l-1 4 5-7H5L6 1Z" fill="#10B981" />
    </svg>
  );
}

function AccessibleIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="6" r="2" />
      <path d="M8 8v6M8 8H5M8 14l3 3M12 10h3l1.5 5" />
      <path d="M16 20a6 6 0 1 1 2-10" />
    </svg>
  );
}

function StaffIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
  );
}

function ParkingSlot({
  slot,
  isSelected,
  onSlotClick,
  compact,
}: {
  slot: SlotWithStatus;
  isSelected: boolean;
  onSlotClick?: (slot: SlotWithStatus) => void;
  compact?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const slotNum = slot.slot_number.split('-')[1] || slot.slot_number;
  
  const isEV = slot.slot_type?.toLowerCase().includes('ev') || slot.slot_type?.toLowerCase().includes('electric');
  const isAccessible = slot.slot_type?.toLowerCase().includes('accessible') || slot.slot_type?.toLowerCase().includes('handicap');
  const isStaff = slot.slot_type?.toLowerCase().includes('staff') || slot.slot_type?.toLowerCase().includes('faculty') || slot.slot_type?.toLowerCase().includes('restricted');

  const bayW = compact ? 62 : 78;
  const bayH = compact ? 98 : 124;

  let statusLabel = 'UNAVAILABLE';
  let dotColor = '#9CA3AF';
  let showCar = false;
  let canClick = false;
  let showDashedFree = false;
  let curbColor = '#FDFDFD'; // White/light-grey curb
  let glow = 'inset 0 4px 8px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.05)';

  if (isSelected) {
    statusLabel = 'SELECTED';
    dotColor = '#174C3C';
    canClick = true;
    curbColor = '#C7F36B'; // Lime green border for selected
    glow = '0 0 16px rgba(199,243,107,0.5), inset 0 4px 8px rgba(0,0,0,0.03)';
  } else if (slot.status === 'AVAILABLE') {
    statusLabel = 'FREE';
    dotColor = '#10B981';
    canClick = true;
    showDashedFree = true;
  } else if (slot.status === 'OCCUPIED') {
    statusLabel = 'OCCUPIED';
    dotColor = '#EF4444';
    showCar = true;
  } else if (slot.status === 'RESERVED') {
    statusLabel = 'RESERVED';
    dotColor = '#F59E0B';
    showCar = true; 
  } else {
    statusLabel = 'UNAVAILABLE';
    dotColor = '#9CA3AF';
  }

  const hoverStyle = hovered && canClick ? {
    transform: 'translateY(-2px) scale(1.02)',
    boxShadow: isSelected ? glow : '0 8px 16px rgba(23,76,60,0.1), inset 0 4px 8px rgba(0,0,0,0.06)',
    zIndex: 10,
  } : {};

  return (
    <div
      onClick={() => canClick && onSlotClick?.(slot)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${slot.slot_number} — ${slot.status}${slot.slot_type ? ` (${slot.slot_type})` : ''}`}
      style={{
        width: bayW,
        height: bayH,
        background: 'rgba(0,0,0,0.035)', // Concrete/asphalt bay surface
        borderTop: `6px solid ${curbColor}`,
        borderLeft: `6px solid ${curbColor}`,
        borderRight: `6px solid ${curbColor}`,
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        borderTopLeftRadius: compact ? 12 : 14,
        borderTopRightRadius: compact ? 12 : 14,
        borderBottomLeftRadius: 3,
        borderBottomRightRadius: 3,
        boxShadow: glow,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: canClick ? 'pointer' : 'default',
        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        userSelect: 'none',
        ...hoverStyle,
      }}
    >
      {/* Top Left Pill for Slot Number */}
      <div style={{
        position: 'absolute', top: compact ? 4 : 6, left: compact ? 4 : 6,
        background: '#374151', color: 'white',
        fontSize: compact ? 8 : 10, fontWeight: 700,
        padding: compact ? '2px 5px' : '2px 6px',
        borderRadius: 4, zIndex: 2
      }}>
        {slotNum}
      </div>

      {/* EV Charging Icon */}
      {isEV && (
        <div style={{ position: 'absolute', top: compact ? 5 : 8, right: compact ? 5 : 8, zIndex: 2 }}>
          <EVIcon size={compact ? 10 : 12} />
        </div>
      )}

      {/* Middle Area Content */}
      <div style={{
        flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: compact ? 18 : 22, marginBottom: compact ? 20 : 26, pointerEvents: 'none',
      }}>
        {showCar ? (
          <CarSilhouette 
            color={slot.status === 'RESERVED' ? '#FBBF24' : getCarColor(slot.id)} 
            size={compact ? 26 : 32} 
          />
        ) : isStaff ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#9CA3AF', opacity: 0.8 }}>
            <StaffIcon size={compact ? 20 : 24} />
            <span style={{ fontSize: compact ? 6.5 : 7.5, fontWeight: 800, marginTop: 4, letterSpacing: '0.02em' }}>STAFF ONLY</span>
          </div>
        ) : isAccessible ? (
          <div style={{ color: '#9CA3AF', opacity: 0.8 }}>
            <AccessibleIcon size={compact ? 24 : 32} />
          </div>
        ) : showDashedFree ? (
          <div style={{
            width: compact ? 26 : 32, height: compact ? 42 : 52,
            border: '2px dashed #10B981', borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0.6,
          }}>
            <span style={{ color: '#10B981', fontSize: compact ? 16 : 20, fontWeight: 400 }}>+</span>
          </div>
        ) : (
          <div style={{
            width: compact ? 26 : 32, height: compact ? 42 : 52,
            border: '2px dashed #9CA3AF', borderRadius: 6, opacity: 0.3
          }} />
        )}
      </div>

      {/* Bottom Status Label */}
      <div style={{
        position: 'absolute', bottom: compact ? 4 : 6, width: '100%',
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5
      }}>
        <div style={{
          width: compact ? 5 : 6, height: compact ? 5 : 6, borderRadius: '50%',
          background: dotColor, boxShadow: `0 0 5px ${dotColor}`
        }} />
        <span style={{
          fontSize: compact ? 8 : 9.5, fontWeight: 700, color: '#4B5563', letterSpacing: '0.02em'
        }}>
          {statusLabel}
        </span>
      </div>
    </div>
  );
}

function LaneArrow() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100%', paddingBlock: 4, opacity: 0.35,
    }}>
      <svg width="60" height="14" viewBox="0 0 60 14" fill="none">
        <path d="M2 7h56M52 2l6 5-6 5" stroke="#174C3C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function ParkingLegend() {
  const items = [
    { label: 'Available',   dot: '#10B981' },
    { label: 'Reserved',    dot: '#F59E0B' },
    { label: 'Occupied',    dot: '#EF4444' },
    { label: 'Unavailable', dot: '#9CA3AF' },
    { label: 'Selected',    dot: '#174C3C' },
  ];
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
      {items.map(it => (
        <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: it.dot,
            boxShadow: `0 0 5px ${it.dot}55`,
          }} />
          <span style={{ fontSize: 11, color: '#68736B', fontWeight: 600, letterSpacing: '0.02em' }}>
            {it.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ParkingGrid({ slots, selectedSlotId, onSlotClick, compact }: ParkingGridProps) {
  const rows = groupByRow(slots);
  const rowEntries = Array.from(rows.entries());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
      {/* Entrance indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        paddingRight: 8, marginBottom: compact ? 4 : 6, gap: 6, opacity: 0.55,
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 2v10M2 7l5 5 5-5" stroke="#174C3C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: '#174C3C', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Entrance
        </span>
      </div>

      {rowEntries.map(([row, rowSlots], rowIdx) => (
        <div key={row}>
          {/* Driving lane between rows */}
          {rowIdx > 0 && !compact && (
            <div style={{
              height: 24, margin: '6px 0',
              background: 'linear-gradient(90deg, transparent 0%, rgba(23,76,60,0.03) 50%, transparent 100%)',
              borderTop: '1px dashed rgba(23,76,60,0.12)',
              borderBottom: '1px dashed rgba(23,76,60,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              <LaneArrow />
              <span style={{
                position: 'absolute', left: 0,
                fontSize: 8.5, fontWeight: 700, color: '#174C3C',
                opacity: 0.4, letterSpacing: '0.06em', textTransform: 'uppercase', paddingLeft: 6,
              }}>
                Drive Lane
              </span>
            </div>
          )}

          <div style={{
            display: 'flex', alignItems: 'center',
            gap: compact ? 6 : 8, padding: compact ? '4px 0' : '5px 0',
          }}>
            {/* Row label */}
            <div style={{
              width: compact ? 18 : 22, fontSize: compact ? 11 : 12, fontWeight: 800,
              color: '#174C3C', opacity: 0.6, textAlign: 'center', flexShrink: 0,
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              {row}
            </div>

            {/* Slots */}
            <div style={{ display: 'flex', gap: compact ? 6 : 8, flexWrap: 'wrap' }}>
              {rowSlots.map(slot => (
                <ParkingSlot
                  key={slot.id}
                  slot={slot}
                  isSelected={slot.id === selectedSlotId}
                  onSlotClick={onSlotClick}
                  compact={compact}
                />
              ))}
            </div>

          </div>
        </div>
      ))}

      {/* Exit indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        paddingRight: 8, marginTop: compact ? 4 : 6, gap: 6, opacity: 0.55,
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 12V2M2 7l5-5 5 5" stroke="#174C3C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: '#174C3C', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Exit
        </span>
      </div>
    </div>
  );
}
