import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import NeedsPage from './pages/NeedsPage';
import VolunteersPage from './pages/VolunteersPage';
import MatchingPage from './pages/MatchingPage';
import MyTasksPage from './pages/MyTasksPage';
import UploadPage from './pages/UploadPage';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-surface-200/60 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <h2 className="text-xl font-display font-semibold gradient-text">Community Aid Platform</h2>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="needs" element={<NeedsPage />} />
        <Route path="volunteers" element={
          <ProtectedRoute roles={['ngo_admin', 'super_admin']}>
            <VolunteersPage />
          </ProtectedRoute>
        } />
        <Route path="matching" element={
          <ProtectedRoute roles={['ngo_admin', 'super_admin']}>
            <MatchingPage />
          </ProtectedRoute>
        } />
        <Route path="my-tasks" element={
          <ProtectedRoute roles={['volunteer']}>
            <MyTasksPage />
          </ProtectedRoute>
        } />
        <Route path="upload" element={
          <ProtectedRoute roles={['ngo_admin', 'super_admin']}>
            <UploadPage />
          </ProtectedRoute>
        } />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
