import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePage() {
  const { loginSuccess, token } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    gender: '',
    dateOfBirth: '',
  });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .patientMe()
      .then((data) => {
        const p = data.patient || {};
        const u = data.user || {};
        setForm({
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          phone: p.phone || u.phone || '',
          email: p.email || u.email || '',
          address: p.address || '',
          gender: p.gender || '',
          dateOfBirth: p.dateOfBirth ? String(p.dateOfBirth).slice(0, 10) : '',
        });
      })
      .catch((err) => setError(err.message));
  }, []);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const data = await api.updatePatientMe({
        ...form,
        dateOfBirth: form.dateOfBirth || null,
      });
      if (token && data.user) {
        loginSuccess({ token, user: data.user });
      }
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div>
        <h1>Profile</h1>
        <p className="muted">Your Clinicy patient account</p>
      </div>
      <form className="panel stack" onSubmit={onSubmit} style={{ maxWidth: 520 }}>
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
          Phone
          <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
        </label>
        <label className="field">
          Contact email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
          />
        </label>
        <label className="field">
          Address
          <textarea
            rows={2}
            value={form.address}
            onChange={(e) => setField('address', e.target.value)}
          />
        </label>
        <div className="row">
          <label className="field">
            Gender
            <input value={form.gender} onChange={(e) => setField('gender', e.target.value)} />
          </label>
          <label className="field">
            Date of birth
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setField('dateOfBirth', e.target.value)}
            />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        {saved && <p className="badge">Saved</p>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}
