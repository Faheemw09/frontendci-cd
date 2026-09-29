import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/auth/LoginPage';
import AdminDashboard from './pages/clinic_admin/AdminDashboard';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import SuperAdminDashboard from './pages/super_admin/SuperAdminDashboard';
import ClinicDirectoryPage from './pages/public/ClinicDirectoryPage';
import ClinicProfilePage from './pages/public/ClinicProfilePage';
import BookingPage from './pages/public/BookingPage';
import PatientLoginPage from './pages/patient/PatientLoginPage';
import PatientRegisterPage from './pages/patient/PatientRegisterPage';
import AccountLayout from './pages/patient/AccountLayout';
import AppointmentsPage from './pages/patient/AppointmentsPage';
import TicketsPage from './pages/patient/TicketsPage';
import ProfilePage from './pages/patient/ProfilePage';
import './styles.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ClinicDirectoryPage />} />
          <Route path="/clinics/:slug" element={<ClinicProfilePage />} />
          <Route path="/clinics/:slug/book" element={<BookingPage />} />

          <Route path="/account/login" element={<PatientLoginPage />} />
          <Route path="/account/register" element={<PatientRegisterPage />} />
          <Route path="/account" element={<AccountLayout />}>
            <Route index element={<Navigate to="appointments" replace />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="tickets" element={<TicketsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          <Route path="/login" element={<LoginPage />} />
          <Route path="/super" element={<SuperAdminDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/doctor" element={<DoctorDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
