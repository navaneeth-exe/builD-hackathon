import { useEffect, useState } from 'react';
import TopBar from '../components/TopBar';
import { fetchParkingInsights } from '../api';
import { Brain, TrendingUp, CheckCircle, Clock, BarChart3, AlertCircle } from 'lucide-react';

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
        <TopBar title="Parking Intelligence" subtitle="AI-powered analytics and system insights" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" style={{ width: 40, height: 40, borderTopColor: '#174C3C' }} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-container">
        <TopBar title="Parking Intelligence" subtitle="AI-powered analytics and system insights" />
        <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
          <div className="soft-card" style={{ padding: 32, maxWidth: 480, textAlign: 'center', borderRadius: 28, background: '#FEF2F2', border: '1px solid #FEE2E2' }}>
            <AlertCircle size={32} color="#DC2626" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#991B1B', fontWeight: 800 }}>Analysis Failed</h3>
            <p style={{ margin: '0 0 24px 0', color: '#B91C1C', fontSize: 14 }}>{error}</p>
            <button onClick={loadInsights} className="soft-btn-primary" style={{ background: '#DC2626', margin: '0 auto' }}>Try Again</button>
          </div>
        </div>
      </div>
    );
  }

  const { stats, insights } = data;

  return (
    <div className="page-container">
      <TopBar title="Parking Intelligence" subtitle="AI-powered analytics and system insights" />
      
      <div style={{ padding: '24px 32px', flex: 1, overflowY: 'auto', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        
        {/* AI Insights Panel */}
        <div className="soft-card" style={{ 
          padding: 32, marginBottom: 24, borderRadius: 28, 
          background: 'linear-gradient(135deg, #174C3C 0%, #0B2920 100%)', color: '#FFFFFF',
          boxShadow: '0 24px 48px rgba(23,76,60,0.2)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(199,243,107,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(199,243,107,0.2)' }}>
              <Brain color="#C7F36B" size={24} />
            </div>
            <div>
               <h2 style={{ margin: 0, fontSize: 22, color: '#C7F36B', fontWeight: 800, letterSpacing: '-0.02em' }}>DeepMind Insight Engine</h2>
               <div style={{ fontSize: 13, color: '#A7C9BE', marginTop: 4, fontWeight: 600 }}>Real-time generative analysis based on current utilization data</div>
            </div>
          </div>
          
          <div style={{ 
            fontSize: 15, lineHeight: 1.7, color: '#FFFFFF', fontWeight: 500,
            whiteSpace: 'pre-line', padding: 24, 
            background: 'rgba(0,0,0,0.15)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)'
          }}>
            {insights}
          </div>
        </div>

        {/* Stats Grid */}
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1A2420', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
           <BarChart3 size={20} color="#174C3C" /> System Metrics
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
          <div className="soft-card" style={{ padding: 24, borderRadius: 24, background: '#FFFFFF', boxShadow: '0 12px 32px rgba(23,76,60,0.04)' }}>
            <div style={{ color: '#9AADA5', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Total Capacity</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#174C3C', lineHeight: 1 }}>{stats.total_capacity}</div>
          </div>
          <div className="soft-card" style={{ padding: 24, borderRadius: 24, background: '#FFFFFF', boxShadow: '0 12px 32px rgba(23,76,60,0.04)' }}>
            <div style={{ color: '#9AADA5', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Current Occupancy</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#174C3C', lineHeight: 1 }}>{stats.current_occupancy}</div>
          </div>
          <div className="soft-card" style={{ padding: 24, borderRadius: 24, background: '#FFFFFF', boxShadow: '0 12px 32px rgba(23,76,60,0.04)' }}>
            <div style={{ color: '#9AADA5', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Cancellation Rate</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#174C3C', lineHeight: 1 }}>{stats.cancellation_rate_pct}%</div>
          </div>
          <div className="soft-card" style={{ padding: 24, borderRadius: 24, background: '#FFFFFF', boxShadow: '0 12px 32px rgba(23,76,60,0.04)' }}>
            <div style={{ color: '#9AADA5', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Avg Duration</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#174C3C', lineHeight: 1 }}>{Math.round(stats.avg_booking_duration_mins)}<span style={{ fontSize: 20, color: '#68736B' }}>m</span></div>
          </div>
        </div>

        {/* Utilization Details */}
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1A2420', margin: '0 0 16px 0' }}>Zone Utilization Patterns</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div className="soft-card" style={{ padding: 24, borderRadius: 24, background: '#FFFFFF', border: '1px solid #FEE2E2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <TrendingUp color="#DC2626" size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, color: '#991B1B', fontWeight: 800 }}>Heavily Used Zone</h3>
            </div>
            <div style={{ fontSize: 22, color: '#1A2420', fontWeight: 800, marginBottom: 8 }}>
              {stats.most_heavily_used_zone}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#627068', lineHeight: 1.5 }}>Consistently reaches peak capacity during core campus hours. May require load balancing.</p>
          </div>

          <div className="soft-card" style={{ padding: 24, borderRadius: 24, background: '#FFFFFF', border: '1px solid #D1FAE5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <CheckCircle color="#059669" size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, color: '#065F46', fontWeight: 800 }}>Underutilized Zone</h3>
            </div>
            <div style={{ fontSize: 22, color: '#1A2420', fontWeight: 800, marginBottom: 8 }}>
              {stats.underutilized_zone}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#627068', lineHeight: 1.5 }}>High availability block. Ideal for redirecting peak traffic or assigning temporary parking.</p>
          </div>

          <div className="soft-card" style={{ padding: 24, borderRadius: 24, background: '#FFFFFF', border: '1px solid #FEF3C7' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <Clock color="#D97706" size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, color: '#B45309', fontWeight: 800 }}>Peak Parking Hours</h3>
            </div>
            <div style={{ fontSize: 22, color: '#1A2420', fontWeight: 800, marginBottom: 8 }}>
              {stats.peak_parking_hours}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#627068', lineHeight: 1.5 }}>Highest volume of active reservations and check-ins. Ensure gatekeepers are staffed.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
