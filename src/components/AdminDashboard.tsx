import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart3, Users, Car, AlertCircle, LayoutDashboard, Clock, RefreshCw } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalLots: 0,
    totalSlots: 0,
    activeReservations: 0,
    availableSlots: 0,
  });
  
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const handleDemoReset = async () => {
    if (!confirm('Are you sure you want to reset all reservations and logs for the demo?')) return;
    
    setResetting(true);
    try {
      // Delete all reservations (filtering by not equal to a dummy UUID to delete all)
      await supabase.from('reservations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Delete all audit logs
      await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Reset all slots to AVAILABLE
      await supabase.from('slots').update({ status: 'AVAILABLE' }).neq('id', '00000000-0000-0000-0000-000000000000');
      
      alert("Demo data has been successfully reset!");
      fetchDashboardData();
    } catch (error) {
      console.error('Error resetting data:', error);
      alert("Failed to reset demo data.");
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Subscribe to realtime changes for live dashboard
    const sub = supabase.channel('dashboard_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, fetchDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, fetchDashboardData)
      .subscribe();
      
    return () => {
      supabase.removeChannel(sub);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats
      const { count: lotsCount } = await supabase.from('lots').select('*', { count: 'exact', head: true });
      const { count: slotsCount } = await supabase.from('slots').select('*', { count: 'exact', head: true });
      
      const { data: activeRes } = await supabase.from('reservations')
        .select('*')
        .in('status', ['CONFIRMED', 'CHECKED_IN']);
        
      const activeReservationsCount = activeRes?.length || 0;
      
      setStats({
        totalLots: lotsCount || 0,
        totalSlots: slotsCount || 0,
        activeReservations: activeReservationsCount,
        availableSlots: (slotsCount || 0) - activeReservationsCount
      });
      
      // Fetch recent audit logs
      const { data: logs } = await supabase.from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (logs) setRecentLogs(logs);
      
    } catch (error) {
      console.error('Error fetching dashboard data', error);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-blue-600">ParkSync Admin</h1>
        </div>
        <div className="flex-1 py-4">
          <a href="#" className="flex items-center gap-3 px-6 py-3 bg-blue-50 text-blue-700 border-r-4 border-blue-600 font-medium">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-6 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900">
            <Car className="w-5 h-5" />
            Lots & Slots
          </a>
          <a href="#" className="flex items-center gap-3 px-6 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900">
            <Users className="w-5 h-5" />
            Users
          </a>
          <a href="#" className="flex items-center gap-3 px-6 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900">
            <BarChart3 className="w-5 h-5" />
            Reports
          </a>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm">
          <h2 className="text-lg font-medium text-gray-800">Overview</h2>
          <button
            onClick={handleDemoReset}
            disabled={resetting}
            className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
            {resetting ? 'Resetting...' : 'Reset Demo Data'}
          </button>
        </header>
        
        <main className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total Parking Lots</p>
                <h3 className="text-3xl font-bold text-gray-900">{stats.totalLots}</h3>
              </div>
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                <LayoutDashboard className="w-6 h-6" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total Slots</p>
                <h3 className="text-3xl font-bold text-gray-900">{stats.totalSlots}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                <Car className="w-6 h-6" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Available Slots</p>
                <h3 className="text-3xl font-bold text-green-600">{stats.availableSlots}</h3>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Active Reservations</p>
                <h3 className="text-3xl font-bold text-orange-600">{stats.activeReservations}</h3>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-600">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Recent Activity Logs</h3>
            </div>
            
            {recentLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No activity logs found.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentLogs.map(log => (
                  <div key={log.id} className="p-4 px-6 hover:bg-gray-50 transition flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium">
                        Action: <span className="text-blue-600 font-bold">{log.action}</span> by {log.actor}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Reservation ID: <span className="font-mono">{log.reservation_id}</span>
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function CheckCircle(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}
