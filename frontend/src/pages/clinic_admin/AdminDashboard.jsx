import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import OverviewTab from './OverviewTab';
import DoctorsTab from './DoctorsTab';
import AppointmentsTab from './AppointmentsTab';
import StaffTab from './StaffTab';
import TicketsTab from './TicketsTab';
import SettingsTab from './SettingsTab';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'doctors', label: 'Doctors' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'staff', label: 'Staff' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'settings', label: 'Settings' },
];

export default function AdminDashboard() {
  const { user, loading, logout } = useAuth();
  const [tab, setTab] = useState('overview');

  if (loading) return <p className="muted" style={{ padding: 24 }}>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'clinic_admin') {
    return (
      <div className="login-page">
        <div className="panel">
          <h2>Access restricted</h2>
          <p className="muted">This dashboard is for clinic admins.</p>
          <button className="btn" type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          Clinicy
          <span>Clinic admin</span>
        </div>
        <nav className="stack" style={{ gap: 4 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`nav-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <p className="muted" style={{ color: '#c9d8d3', padding: '0 0.5rem' }}>
            {user.firstName} {user.lastName}
          </p>
          <button className="nav-btn" type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div>
            <h1 style={{ fontSize: '1.7rem' }}>{TABS.find((t) => t.id === tab)?.label}</h1>
          </div>
        </div>
        {tab === 'overview' && <OverviewTab />}
        {tab === 'doctors' && <DoctorsTab />}
        {tab === 'appointments' && <AppointmentsTab />}
        {tab === 'staff' && <StaffTab />}
        {tab === 'tickets' && <TicketsTab />}
        {tab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
}
