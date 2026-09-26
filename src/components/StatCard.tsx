import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  accent?: string;  // bg color for icon area
  iconColor?: string;
  suffix?: string;
  pct?: string;
}

export default function StatCard({
  label, value, icon, accent = '#E8F4EF', iconColor = '#174C3C', suffix, pct
}: StatCardProps) {
  return (
    <div className="stat-card">
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: iconColor, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11.5, color: '#68736B', fontWeight: 500, marginBottom: 3 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#202923', lineHeight: 1 }}>{value}</span>
          {pct && <span style={{ fontSize: 12, color: '#68736B' }}>{pct}</span>}
          {suffix && <span style={{ fontSize: 12, color: '#68736B' }}>{suffix}</span>}
        </div>
      </div>
    </div>
  );
}
