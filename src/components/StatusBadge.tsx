
const MAP: Record<string, { bg: string; color: string; label: string }> = {
  CONFIRMED:    { bg: '#DDF5E5', color: '#065F46', label: 'Confirmed' },
  CHECKED_IN:   { bg: '#C7F36B', color: '#174C3C', label: 'Checked In' },
  COMPLETED:    { bg: '#E5EAE4', color: '#374151', label: 'Completed' },
  CANCELLED:    { bg: '#FCE2E2', color: '#B91C1C', label: 'Cancelled' },
  AVAILABLE:    { bg: '#DDF5E5', color: '#065F46', label: 'Available' },
  RESERVED:     { bg: '#FEF0C7', color: '#92400E', label: 'Reserved' },
  OCCUPIED:     { bg: '#FCE2E2', color: '#B91C1C', label: 'Occupied' },
  UNAVAILABLE:  { bg: '#E8EBE8', color: '#6B7280', label: 'Unavailable' },
};

interface StatusBadgeProps {
  status: string;
  small?: boolean;
}

export default function StatusBadge({ status, small }: StatusBadgeProps) {
  const cfg = MAP[status.toUpperCase()] ?? { bg: '#E5EAE4', color: '#374151', label: status };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: small ? '1px 7px' : '2px 9px',
      borderRadius: 99,
      background: cfg.bg, color: cfg.color,
      fontSize: small ? 11 : 12,
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}
