import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import PublicLayout from '../../components/PublicLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export default function PatientLoginPage() {
  const { user, loginSuccess } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/account/appointments';

  const [email, setEmail] = useState('patient.one@clinicy.local');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user?.role === 'patient') {
    return <Navigate to={from} replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api.login({ email, password, role: 'patient' });
      if (data.user.role !== 'patient') {
        throw new Error('This login is for patients only');
      }
      loginSuccess(data);
      navigate(from);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicLayout>
      <form className="panel login-card stack" onSubmit={onSubmit}>
        <div>
          <h1>Patient sign in</h1>
          <p className="muted">Access appointments, tickets, and your profile</p>
        </div>
        <label className="field">
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="muted">
          New here? <Link to="/account/register">Create an account</Link>
        </p>
      </form>
    </PublicLayout>
  );
}
