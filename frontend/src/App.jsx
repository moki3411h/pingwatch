import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import MonitorDetailPage from './pages/MonitorDetailPage';
import IncidentsPage from './pages/IncidentsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        } />
        <Route path="/monitors/:id" element={
          <ProtectedRoute><MonitorDetailPage /></ProtectedRoute>
        } />
        <Route path="/incidents" element={
          <ProtectedRoute><IncidentsPage /></ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
