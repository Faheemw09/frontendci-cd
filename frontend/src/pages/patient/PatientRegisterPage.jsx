import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import PublicLayout from '../../components/PublicLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export default function PatientRegisterPage() {
  const { user, loginSuccess } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user?.role === 'patient') {
    return <Navigate to="/account" replace />;
  }

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api.registerPatient(form);
      loginSuccess(data);
      navigate('/account');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicLayout>
      <form className="panel login-card stack" onSubmit={onSubmit} style={{ width: 'min(480px, 100%)' }}>
        <div>
          <h1>Create patient account</h1>
          <p className="muted">One account works across all Clinicy clinics</p>
        </div>
        <div className="row">
          <label className="field">
            First name
            <input
              value={form.firstName}
              onChange={(e) => setField('firstName', e.target.value)}
              required
            />
          </label>
          <label className="field">
            Last name
            <input
              value={form.lastName}
              onChange={(e) => setField('lastName', e.target.value)}
              required
            />
          </label>
        </div>
        <label className="field">
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            required
          />
        </label>
        <label className="field">
          Phone
          <input
            value={form.phone}
            onChange={(e) => setField('phone', e.target.value)}
            required
          />
        </label>
        <label className="field">
          Password
          <input
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => setField('password', e.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Register'}
        </button>
        <p className="muted">
          Already registered? <Link to="/account/login">Sign in</Link>
        </p>
      </form>
    </PublicLayout>
  );
}
