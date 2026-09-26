import type { SlotWithStatus } from '../types';

interface ParkingGridProps {
  slots: SlotWithStatus[];
  selectedSlotId?: string | null;
  onSlotClick?: (slot: SlotWithStatus) => void;
  compact?: boolean;
}

// Group slots by row letter (A, B, C, ...)
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

const STATUS_STYLES: Record<string, { bg: string; border: string; cursor: string }> = {
  AVAILABLE:   { bg: '#DDF5E5', border: '#A7E8BC', cursor: 'pointer' },
  SELECTED:    { bg: '#C7F36B', border: '#A8D44E', cursor: 'pointer' },
  RESERVED:    { bg: '#FEF0C7', border: '#FCD34D', cursor: 'default' },
  OCCUPIED:    { bg: '#FCE2E2', border: '#FCA5A5', cursor: 'default' },
  UNAVAILABLE: { bg: '#E8EBE8', border: '#D1D5DB', cursor: 'default' },
};

export function ParkingLegend() {
  const items = [
    { label: 'Available',   bg: '#DDF5E5', border: '#A7E8BC' },
    { label: 'Reserved',    bg: '#FEF0C7', border: '#FCD34D' },
    { label: 'Occupied',    bg: '#FCE2E2', border: '#FCA5A5' },
    { label: 'Unavailable', bg: '#E8EBE8', border: '#D1D5DB' },
    { label: 'Selected',    bg: '#C7F36B', border: '#A8D44E' },
  ];
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {items.map(it => (
        <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 12, height: 12, borderRadius: 3,
            background: it.bg, border: `1.5px solid ${it.border}`,
          }} />
          <span style={{ fontSize: 11.5, color: '#68736B', fontWeight: 500 }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function ParkingGrid({ slots, selectedSlotId, onSlotClick, compact }: ParkingGridProps) {
  const rows = groupByRow(slots);
  const cellW = compact ? 42 : 48;
  const cellH = compact ? 38 : 44;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {Array.from(rows.entries()).map(([row, rowSlots]) => (
        <div key={row} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {/* Row label */}
          <div style={{
            width: 20, fontSize: 11, fontWeight: 700,
            color: '#68736B', textAlign: 'center', flexShrink: 0,
          }}>{row}</div>

          {/* Slots */}
          {rowSlots.map(slot => {
            const isSelected = slot.id === selectedSlotId;
            const effectiveStatus = isSelected ? 'SELECTED' : slot.status;
            const style = STATUS_STYLES[effectiveStatus] ?? STATUS_STYLES.UNAVAILABLE;
            const clickable = slot.status === 'AVAILABLE' && onSlotClick;

            return (
              <div
                key={slot.id}
                onClick={() => clickable && onSlotClick(slot)}
                title={`${slot.slot_number} — ${slot.status}${slot.slot_type ? ` (${slot.slot_type})` : ''}`}
                style={{
                  width: cellW, height: cellH,
                  borderRadius: 6, border: `1.5px solid ${style.border}`,
                  background: style.bg,
                  cursor: style.cursor,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 9.5, fontWeight: 700, color: '#202923',
                  transition: 'transform 0.1s, box-shadow 0.1s',
                  userSelect: 'none',
                  ...(clickable ? {} : {}),
                }}
                onMouseEnter={e => {
                  if (!clickable) return;
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1.07)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
                  (e.currentTarget as HTMLElement).style.zIndex = '1';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                  (e.currentTarget as HTMLElement).style.zIndex = '';
                }}
              >
                <span style={{ fontSize: compact ? 9 : 10 }}>{slot.slot_number}</span>
                {!compact && (
                  <span style={{ fontSize: 8, color: '#68736B', marginTop: 1, fontWeight: 500 }}>
                    {slot.slot_type}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
