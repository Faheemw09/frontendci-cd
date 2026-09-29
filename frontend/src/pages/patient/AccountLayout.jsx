import { NavLink, Outlet } from 'react-router-dom';
import PublicLayout from '../../components/PublicLayout';
import RequirePatient from '../../components/RequirePatient';
import { useAuth } from '../../context/AuthContext';

export default function AccountLayout() {
  const { user } = useAuth();

  return (
    <RequirePatient>
      <PublicLayout>
        <div className="account-layout">
          <aside className="account-nav panel">
            <p className="muted">Signed in as</p>
            <strong>
              {user?.firstName} {user?.lastName}
            </strong>
            <nav className="stack" style={{ marginTop: '1rem' }}>
              <NavLink to="/account/appointments">Appointments</NavLink>
              <NavLink to="/account/tickets">Support tickets</NavLink>
              <NavLink to="/account/profile">Profile</NavLink>
            </nav>
          </aside>
          <div className="account-content">
            <Outlet />
          </div>
        </div>
      </PublicLayout>
    </RequirePatient>
  );
}
