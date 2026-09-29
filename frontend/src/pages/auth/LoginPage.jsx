import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ROLE_HOME = {
  super_admin: '/super',
  clinic_admin: '/admin',
  doctor: '/doctor',
  patient: '/account',
};

export default function LoginPage() {
  const { user, loginSuccess } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('clinic_admin');
  const [email, setEmail] = useState('admin@kashmir-care.local');
  const [password, setPassword] = useState('Password123!');
  const [clinicSlug, setClinicSlug] = useState('kashmir-care');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user && ROLE_HOME[user.role]) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }

  function onRoleChange(next) {
    setRole(next);
    if (next === 'doctor') {
      setEmail('dr.raza@kashmir-care.local');
      setPassword('Password123!');
      setClinicSlug('kashmir-care');
    } else if (next === 'super_admin') {
      setEmail('admin@clinicy.local');
      setPassword('ChangeMe123!');
      setClinicSlug('');
    } else {
      setEmail('admin@kashmir-care.local');
      setPassword('Password123!');
      setClinicSlug('kashmir-care');
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = { email, password, role };
      if (role !== 'super_admin' && clinicSlug) payload.clinicSlug = clinicSlug;
      const data = await api.login(payload);
      if (!ROLE_HOME[data.user.role]) {
        throw new Error('Unsupported role for these dashboards');
      }
      loginSuccess(data);
      navigate(ROLE_HOME[data.user.role]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <form className="panel login-card stack" onSubmit={onSubmit}>
        <div>
          <h1>Clinicy</h1>
          <p className="muted">Sign in to your workspace</p>
        </div>
        <div className="tabs-inline">
          {[
            ['clinic_admin', 'Clinic admin'],
            ['doctor', 'Doctor'],
            ['super_admin', 'Super admin'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={role === value ? 'active' : ''}
              onClick={() => onRoleChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="field">
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label className="field">
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>
        {role !== 'super_admin' && (
          <label className="field">
            Clinic slug
            <input
              value={clinicSlug}
              onChange={(e) => setClinicSlug(e.target.value)}
              placeholder="kashmir-care"
              required
            />
          </label>
        )}
        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={busy} type="submit">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="muted">
          Patient? Use the <a href="/account/login">patient sign-in</a> or{' '}
          <a href="/">clinic directory</a>.
        </p>
      </form>
    </div>
  );
}
