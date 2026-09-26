import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ReserveParking from './pages/ReserveParking';
import MyBookings from './pages/MyBookings';
import ScanQR from './pages/ScanQR';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import GatekeeperOverview from './pages/gatekeeper/Overview';
import GatekeeperParking from './pages/gatekeeper/LiveParking';
import GatekeeperVehicles from './pages/gatekeeper/ActiveVehicles';
import GatekeeperBookings from './pages/gatekeeper/BookingLookup';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F2F5' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    if (profile.role === 'admin') return <Navigate to="/admin" replace />;
    if (profile.role === 'staff') return <Navigate to="/gatekeeper" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <>{children}</>;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}

function RootRedirect() {
  const { profile, loading, user } = useAuth();
  if (loading) return null;
  if (!user || !profile) return <Navigate to="/login" replace />;
  if (profile.role === 'admin') return <Navigate to="/admin" replace />;
  if (profile.role === 'staff') return <Navigate to="/gatekeeper" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppLayout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RootRedirect />} />
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['student']}><Dashboard /></ProtectedRoute>} />
          <Route path="/reserve" element={<ProtectedRoute allowedRoles={['student']}><ReserveParking /></ProtectedRoute>} />
          <Route path="/bookings" element={<ProtectedRoute allowedRoles={['student']}><MyBookings /></ProtectedRoute>} />

          {/* Gatekeeper routes */}
          <Route path="/gatekeeper" element={<ProtectedRoute allowedRoles={['staff', 'admin']}><GatekeeperOverview /></ProtectedRoute>} />
          <Route path="/gatekeeper/scan" element={<ProtectedRoute allowedRoles={['staff', 'admin']}><ScanQR /></ProtectedRoute>} />
          <Route path="/gatekeeper/parking" element={<ProtectedRoute allowedRoles={['staff', 'admin']}><GatekeeperParking /></ProtectedRoute>} />
          <Route path="/gatekeeper/vehicles" element={<ProtectedRoute allowedRoles={['staff', 'admin']}><GatekeeperVehicles /></ProtectedRoute>} />
          <Route path="/gatekeeper/bookings" element={<ProtectedRoute allowedRoles={['staff', 'admin']}><GatekeeperBookings /></ProtectedRoute>} />
          
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </AuthProvider>
  );
}
