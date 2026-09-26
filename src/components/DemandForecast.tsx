import { useEffect, useState } from 'react';
import { fetchParkingDemandForecast } from '../api';
import { BarChart2, AlertCircle } from 'lucide-react';

export default function DemandForecast() {
  const [minutes, setMinutes] = useState(30);
  const [forecast, setForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadForecast();
  }, [minutes]);

  async function loadForecast() {
    try {
      setLoading(true);
      const data = await fetchParkingDemandForecast(minutes);
      setForecast(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const getDemandColor = (level: string) => {
    if (level === 'Full') return '#DC2626';
    if (level === 'High') return '#F59E0B';
    if (level === 'Moderate') return '#3B82F6';
    return '#10B981';
  };

  const getRelativeTime = (mins: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + mins);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="soft-card" style={{ padding: 24, marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, color: '#174C3C', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={18} /> AI Demand Forecast
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#68736B' }}>
            Predicting occupancy for {getRelativeTime(minutes)}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 8 }}>
          {[30, 60, 120].map((m) => (
            <button
              key={m}
              onClick={() => setMinutes(m)}
              style={{
                background: minutes === m ? '#174C3C' : '#F7F8F4',
                color: minutes === m ? '#C7F36B' : '#68736B',
                border: 'none', padding: '6px 12px', borderRadius: 8,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {m === 120 ? '2h' : `${m}m`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : forecast.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#909A94', fontSize: 13 }}>
          No forecast data available.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          {forecast.map(f => (
            <div key={f.lot_id} style={{ 
              border: '1px solid #E5EAE4', borderRadius: 12, padding: 16,
              background: '#fff' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ fontWeight: 600, color: '#202923', fontSize: 14 }}>{f.lot_name}</div>
                <div style={{ 
                  background: `${getDemandColor(f.demand_level)}20`,
                  color: getDemandColor(f.demand_level),
                  padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700
                }}>
                  {f.demand_level}
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: '#68736B' }}>
                <span>Occupied: <strong style={{ color: '#202923' }}>{f.predicted_occupied}</strong></span>
                <span>Available: <strong style={{ color: '#202923' }}>{f.predicted_available}</strong></span>
              </div>
              
              <div style={{ width: '100%', height: 6, background: '#F7F8F4', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ 
                  width: `${(f.predicted_occupied / f.total_capacity) * 100}%`, 
                  height: '100%', 
                  background: getDemandColor(f.demand_level),
                  transition: 'width 0.5s ease-in-out'
                }} />
              </div>
              
              {f.demand_level === 'Full' || f.demand_level === 'High' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 11, color: '#DC2626' }}>
                  <AlertCircle size={12} /> Expected to be busy. Consider alternatives.
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
