import { useEffect, useState } from 'react';
import { fetchParkingDemandForecast } from '../api';
import { TrendingUp, AlertCircle } from 'lucide-react';

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
    <div className="soft-card" style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1A2420', display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingUp size={18} color="#174C3C" /> Demand Forecast
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#627068', fontWeight: 500 }}>
            Predicting occupancy at {getRelativeTime(minutes)}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 6, background: '#F8FAF7', padding: 4, borderRadius: 12, border: '1px solid #E3EBE6' }}>
          {[30, 60, 120].map((m) => (
            <button
              key={m}
              onClick={() => setMinutes(m)}
              style={{
                background: minutes === m ? '#FFFFFF' : 'transparent',
                color: minutes === m ? '#174C3C' : '#627068',
                boxShadow: minutes === m ? '0 2px 8px rgba(23,76,60,0.08)' : 'none',
                border: 'none', padding: '6px 14px', borderRadius: 8,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s', letterSpacing: '0.02em'
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
        <div style={{ padding: 30, textAlign: 'center', color: '#9AADA5', fontSize: 13, fontWeight: 500 }}>
          No forecast data available.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {forecast.map(f => (
            <div key={f.lot_id} style={{ 
              border: '1px solid #E3EBE6', borderRadius: 16, padding: 16,
              background: '#FFFFFF', transition: 'all 0.2s ease',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: '#1A2420', fontSize: 14 }}>{f.lot_name}</div>
                <div style={{ 
                  background: `${getDemandColor(f.demand_level)}15`,
                  color: getDemandColor(f.demand_level),
                  padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.05em'
                }}>
                  {f.demand_level}
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13, color: '#627068', fontWeight: 500 }}>
                <span>Occupied: <strong style={{ color: '#1A2420', fontWeight: 700 }}>{f.predicted_occupied}</strong></span>
                <span>Available: <strong style={{ color: '#1A2420', fontWeight: 700 }}>{f.predicted_available}</strong></span>
              </div>
              
              <div style={{ width: '100%', height: 8, background: '#F0F4F1', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ 
                  width: `${(f.predicted_occupied / f.total_capacity) * 100}%`, 
                  height: '100%', 
                  background: getDemandColor(f.demand_level),
                  transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }} />
              </div>
              
              {f.demand_level === 'Full' || f.demand_level === 'High' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, fontSize: 12, color: '#DC2626', fontWeight: 500 }}>
                  <AlertCircle size={14} /> Expected to be busy. Consider alternatives.
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
