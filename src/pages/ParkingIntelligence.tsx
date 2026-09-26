import { useEffect, useState } from 'react';
import TopBar from '../components/TopBar';
import { fetchParkingInsights } from '../api';
import { Brain, TrendingUp, CheckCircle, Clock } from 'lucide-react';

export default function ParkingIntelligence() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInsights();
  }, []);

  async function loadInsights() {
    try {
      setLoading(true);
      setError('');
      const response = await fetchParkingInsights();
      setData(response);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load parking intelligence data.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <TopBar title="Parking Intelligence" subtitle="AI-powered analytics and insights" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-container">
        <TopBar title="Parking Intelligence" subtitle="AI-powered analytics and insights" />
        <div className="soft-card" style={{ padding: 24, margin: 24, color: '#DC2626', background: '#FEE2E2' }}>
          {error}
          <br /><br />
          <button onClick={loadInsights} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>Retry</button>
        </div>
      </div>
    );
  }

  const { stats, insights } = data;

  return (
    <div className="page-container">
      <TopBar title="Parking Intelligence" subtitle="AI-powered analytics and insights" />
      
      <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
        
        {/* AI Insights Panel */}
        <div className="soft-card" style={{ padding: 24, marginBottom: 24, background: '#174C3C', color: '#F7F8F4' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Brain color="#C7F36B" size={24} />
            <h2 style={{ margin: 0, fontSize: 18, color: '#C7F36B', fontWeight: 700 }}>AI Parking & Traffic Insights</h2>
          </div>
          <div style={{ 
            fontSize: 14, lineHeight: 1.6, color: '#E5EAE4', 
            whiteSpace: 'pre-line', padding: '16px', 
            background: 'rgba(255,255,255,0.05)', borderRadius: 12 
          }}>
            {insights}
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="soft-card" style={{ padding: 20 }}>
            <div style={{ color: '#68736B', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Total Capacity</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#174C3C' }}>{stats.total_capacity}</div>
          </div>
          <div className="soft-card" style={{ padding: 20 }}>
            <div style={{ color: '#68736B', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Current Occupancy</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#174C3C' }}>{stats.current_occupancy}</div>
          </div>
          <div className="soft-card" style={{ padding: 20 }}>
            <div style={{ color: '#68736B', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Cancellation Rate</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#174C3C' }}>{stats.cancellation_rate_pct}%</div>
          </div>
          <div className="soft-card" style={{ padding: 20 }}>
            <div style={{ color: '#68736B', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Avg Duration</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#174C3C' }}>{Math.round(stats.avg_booking_duration_mins)}m</div>
          </div>
        </div>

        {/* Utilization Details */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div className="soft-card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 15, color: '#174C3C' }}>Heavily Used Zones</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#202923', fontWeight: 600 }}>
              <TrendingUp color="#DC2626" size={20} />
              {stats.most_heavily_used_zone}
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#68736B' }}>Consistently reaches peak capacity during core hours.</p>
          </div>

          <div className="soft-card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 15, color: '#174C3C' }}>Underutilized Zones</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#202923', fontWeight: 600 }}>
              <CheckCircle color="#10B981" size={20} />
              {stats.underutilized_zone}
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#68736B' }}>High availability; ideal for redirecting peak traffic.</p>
          </div>

          <div className="soft-card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 15, color: '#174C3C' }}>Peak Parking Hours</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#202923', fontWeight: 600 }}>
              <Clock color="#F59E0B" size={20} />
              {stats.peak_parking_hours}
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#68736B' }}>Highest volume of active reservations and check-ins.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
