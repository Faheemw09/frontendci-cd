import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api, todayYmd } from '../../services/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function apptDay(a) {
  return (a.appointmentDate || '').toString().slice(0, 10);
}

export default function DoctorDashboard() {
  const { user, loading, logout } = useAuth();
  const [tab, setTab] = useState('schedule');
  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [clinic, setClinic] = useState(null);
  const [windows, setWindows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    const [me, appts, clinicData] = await Promise.all([
      api.getDoctorMe(),
      api.listAppointments({}),
      api.getClinic(),
    ]);
    setDoctor(me.doctor);
    setAppointments(appts.appointments || []);
    setClinic(clinicData.clinic);
    const avail = await api.getAvailability(me.doctor.id);
    setWindows(
      (avail.availability || []).map((w) => ({
        dayOfWeek: w.dayOfWeek,
        startTime: w.startTime,
        endTime: w.endTime,
        isActive: w.isActive !== false,
      }))
    );
  }

  useEffect(() => {
    if (user?.role !== 'doctor') return;
    load().catch((e) => setError(e.message));
  }, [user]);

  const today = todayYmd();
  const { todayList, upcoming } = useMemo(() => {
    const booked = appointments
      .filter((a) => a.status === 'booked')
      .sort((a, b) => `${apptDay(a)}${a.startTime}`.localeCompare(`${apptDay(b)}${b.startTime}`));
    return {
      todayList: booked.filter((a) => apptDay(a) === today),
      upcoming: booked.filter((a) => apptDay(a) > today).slice(0, 20),
    };
  }, [appointments, today]);

  const clinicHours = clinic?.settings?.hours || [];

  function clinicBoundHint(dayOfWeek) {
    const h = clinicHours.find((x) => Number(x.dayOfWeek) === Number(dayOfWeek));
    if (!h) return 'No clinic hours set — any window allowed';
    if (h.closed) return 'Clinic closed this day';
    return `Clinic open ${h.open}–${h.close}`;
  }

  async function markStatus(id, status) {
    setBusy(true);
    setError('');
    try {
      await api.updateAppointmentStatus(id, status);
      setSelected(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveAvailability(e) {
    e.preventDefault();
    if (!doctor) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      await api.replaceAvailability(
        doctor.id,
        windows.filter((w) => w.isActive !== false)
      );
      setMsg('Availability saved');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted" style={{ padding: 24 }}>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'doctor') {
    return (
      <div className="login-page">
        <div className="panel stack">
          <h2>Doctors only</h2>
          <button className="btn" type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="doctor-shell">
      <header className="doctor-top">
        <div>
          <div className="brand-sm">Clinicy</div>
          <h1>
            Dr {user.firstName} {user.lastName}
          </h1>
          <p className="muted">{doctor?.specialization || 'Doctor'}</p>
        </div>
        <button className="btn secondary" type="button" onClick={logout}>
          Sign out
        </button>
      </header>

      {error && <p className="error" style={{ padding: '0 1rem' }}>{error}</p>}
      {msg && <p style={{ color: 'var(--ok)', padding: '0 1rem' }}>{msg}</p>}

      <main className="doctor-main">
        {tab === 'schedule' && (
          <div className="stack">
            <section className="panel stack">
              <h2>Today · {today}</h2>
              {!todayList.length && <p className="muted">No booked patients today.</p>}
              {todayList.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="appt-card"
                  onClick={() => setSelected(a)}
                >
                  <strong>
                    {a.startTime}–{a.endTime}
                  </strong>
                  <span>{a.patient?.fullName || 'Patient'}</span>
                  <span className="badge">{a.status}</span>
                </button>
              ))}
            </section>

            <section className="panel stack">
              <h2>Upcoming</h2>
              {!upcoming.length && <p className="muted">Nothing scheduled ahead.</p>}
              {upcoming.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="appt-card"
                  onClick={() => setSelected(a)}
                >
                  <strong>
                    {apptDay(a)} · {a.startTime}
                  </strong>
                  <span>{a.patient?.fullName || 'Patient'}</span>
                  <span className="badge">{a.status}</span>
                </button>
              ))}
            </section>
          </div>
        )}

        {tab === 'hours' && (
          <form className="panel stack" onSubmit={saveAvailability}>
            <h2>My availability</h2>
            <p className="muted">Must stay within clinic opening hours.</p>
            {windows.map((w, idx) => (
              <div className="hours-row" key={idx}>
                <select
                  value={w.dayOfWeek}
                  onChange={(e) => {
                    const next = [...windows];
                    next[idx] = { ...w, dayOfWeek: Number(e.target.value) };
                    setWindows(next);
                  }}
                >
                  {DAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
                <input
                  value={w.startTime}
                  onChange={(e) => {
                    const next = [...windows];
                    next[idx] = { ...w, startTime: e.target.value };
                    setWindows(next);
                  }}
                />
                <input
                  value={w.endTime}
                  onChange={(e) => {
                    const next = [...windows];
                    next[idx] = { ...w, endTime: e.target.value };
                    setWindows(next);
                  }}
                />
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => setWindows(windows.filter((_, i) => i !== idx))}
                >
                  ✕
                </button>
                <p className="muted hint">{clinicBoundHint(w.dayOfWeek)}</p>
              </div>
            ))}
            <button
              className="btn secondary"
              type="button"
              onClick={() =>
                setWindows([
                  ...windows,
                  { dayOfWeek: 1, startTime: '09:00', endTime: '13:00', isActive: true },
                ])
              }
            >
              Add window
            </button>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save availability'}
            </button>
          </form>
        )}
      </main>

      <nav className="doctor-nav">
        <button
          type="button"
          className={tab === 'schedule' ? 'active' : ''}
          onClick={() => setTab('schedule')}
        >
          Schedule
        </button>
        <button
          type="button"
          className={tab === 'hours' ? 'active' : ''}
          onClick={() => setTab('hours')}
        >
          Hours
        </button>
      </nav>

      {selected && (
        <div className="modal-backdrop">
          <div className="panel modal stack">
            <h3>
              {apptDay(selected)} · {selected.startTime}–{selected.endTime}
            </h3>
            <div className="patient-card">
              <h4>Patient (read-only)</h4>
              <p>
                <strong>{selected.patient?.fullName || '—'}</strong>
              </p>
              <p className="muted">Phone: {selected.patient?.phone || '—'}</p>
              <p className="muted">Email: {selected.patient?.email || '—'}</p>
            </div>
            {selected.status === 'booked' ? (
              <div className="row" style={{ gap: '0.5rem' }}>
                <button
                  className="btn"
                  type="button"
                  disabled={busy}
                  onClick={() => markStatus(selected.id, 'completed')}
                >
                  Completed
                </button>
                <button
                  className="btn secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => markStatus(selected.id, 'no_show')}
                >
                  No-show
                </button>
              </div>
            ) : (
              <span className="badge">{selected.status}</span>
            )}
            <button className="btn secondary" type="button" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
