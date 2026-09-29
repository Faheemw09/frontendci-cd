import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequirePatient({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="muted">Loading…</p>;
  }
  if (!user || user.role !== 'patient') {
    return <Navigate to="/account/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
