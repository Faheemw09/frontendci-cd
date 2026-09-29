import { useEffect, useState } from 'react';
import { api } from '../../services/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const defaultHours = DAYS.map((_, dayOfWeek) => ({
  dayOfWeek,
  open: '09:00',
  close: '17:00',
  closed: dayOfWeek === 0,
}));

export default function SettingsTab() {
  const [clinic, setClinic] = useState(null);
  const [form, setForm] = useState({});
  const [hours, setHours] = useState(defaultHours);
  const [holidays, setHolidays] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getClinic()
      .then((data) => {
        setClinic(data.clinic);
        setForm({
          name: data.clinic.name || '',
          phone: data.clinic.phone || '',
          email: data.clinic.email || '',
          address: data.clinic.address || '',
          city: data.clinic.city || '',
          region: data.clinic.region || '',
          logoUrl: data.clinic.logoUrl || '',
        });
        const s = data.clinic.settings || {};
        setHours(s.hours?.length ? s.hours : defaultHours);
        setHolidays(s.holidays || []);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function save(e) {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const data = await api.updateClinic({
        ...form,
        logoUrl: form.logoUrl || null,
        settings: { hours, holidays },
      });
      setClinic(data.clinic);
      setMessage('Settings saved');
    } catch (err) {
      setError(err.message);
    }
  }

  function onLogoFile(file) {
    if (!file) return;
    // Stub upload: store as data URL until S3 is wired
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, logoUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  }

  if (!clinic) return <p className="muted">Loading clinic settings…</p>;

  return (
    <form className="stack" onSubmit={save}>
      <div>
        <h2>Settings</h2>
        <p className="muted">Clinic profile, logo, address, hours, holidays</p>
      </div>
      {error && <p className="error">{error}</p>}
      {message && <p style={{ color: 'var(--ok)' }}>{message}</p>}

      <div className="panel stack">
        <h3>Profile</h3>
        {['name', 'phone', 'email', 'address', 'city', 'region'].map((k) => (
          <label className="field" key={k}>
            {k}
            <input value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
          </label>
        ))}
        <label className="field">
          Logo upload (stub → data URL / or paste URL)
          <input type="file" accept="image/*" onChange={(e) => onLogoFile(e.target.files?.[0])} />
        </label>
        <label className="field">
          Logo URL
          <input
            value={form.logoUrl || ''}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
          />
        </label>
        {form.logoUrl && (
          <img src={form.logoUrl} alt="Clinic logo" style={{ maxHeight: 64, borderRadius: 8 }} />
        )}
      </div>

      <div className="panel stack">
        <h3>Clinic hours</h3>
        {hours.map((h, idx) => (
          <div className="row" key={h.dayOfWeek}>
            <strong style={{ width: 48 }}>{DAYS[h.dayOfWeek]}</strong>
            <label>
              <input
                type="checkbox"
                checked={!h.closed}
                onChange={(e) => {
                  const next = [...hours];
                  next[idx] = { ...h, closed: !e.target.checked };
                  setHours(next);
                }}
              />{' '}
              Open
            </label>
            <input
              value={h.open}
              disabled={h.closed}
              onChange={(e) => {
                const next = [...hours];
                next[idx] = { ...h, open: e.target.value };
                setHours(next);
              }}
            />
            <input
              value={h.close}
              disabled={h.closed}
              onChange={(e) => {
                const next = [...hours];
                next[idx] = { ...h, close: e.target.value };
                setHours(next);
              }}
            />
          </div>
        ))}
      </div>

      <div className="panel stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3>Holidays</h3>
          <button
            className="btn secondary"
            type="button"
            onClick={() => setHolidays([...holidays, { date: '', label: '' }])}
          >
            Add holiday
          </button>
        </div>
        {holidays.map((h, idx) => (
          <div className="row" key={idx}>
            <input
              type="date"
              value={h.date}
              onChange={(e) => {
                const next = [...holidays];
                next[idx] = { ...h, date: e.target.value };
                setHolidays(next);
              }}
            />
            <input
              placeholder="Label"
              value={h.label}
              onChange={(e) => {
                const next = [...holidays];
                next[idx] = { ...h, label: e.target.value };
                setHolidays(next);
              }}
            />
            <button
              className="btn secondary"
              type="button"
              onClick={() => setHolidays(holidays.filter((_, i) => i !== idx))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button className="btn" type="submit">
        Save settings
      </button>
    </form>
  );
}
