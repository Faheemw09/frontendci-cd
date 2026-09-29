import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, todayYmd } from '../../services/api';

function doctorName(appt) {
  const u = appt.doctor?.user;
  if (u) return `Dr ${u.firstName} ${u.lastName}`;
  return 'Doctor';
}

function dateStr(appt) {
  if (!appt.appointmentDate) return '—';
  return String(appt.appointmentDate).slice(0, 10);
}

export default function AppointmentsPage() {
  const location = useLocation();
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [reschedule, setReschedule] = useState(null);
  const [slots, setSlots] = useState([]);

  async function load() {
    try {
      const data = await api.listAppointments();
      setAppointments(data.appointments || []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCancel(id) {
    if (!window.confirm('Cancel this appointment?')) return;
    setBusyId(id);
    setError('');
    try {
      await api.cancelAppointment(id, 'Cancelled by patient');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function openReschedule(appt) {
    setReschedule({
      id: appt.id,
      doctorId: appt.doctorId,
      date: todayYmd(),
      startTime: '',
    });
    setSlots([]);
  }

  async function loadRescheduleSlots(doctorId, date) {
    try {
      const data = await api.browseSlots(doctorId, date);
      setSlots(data.slots || []);
    } catch (err) {
      setError(err.message);
      setSlots([]);
    }
  }

  useEffect(() => {
    if (reschedule?.doctorId && reschedule?.date) {
      loadRescheduleSlots(reschedule.doctorId, reschedule.date);
    }
  }, [reschedule?.doctorId, reschedule?.date]);

  async function submitReschedule(e) {
    e.preventDefault();
    if (!reschedule?.startTime) {
      setError('Pick a new slot');
      return;
    }
    setBusyId(reschedule.id);
    setError('');
    try {
      await api.rescheduleAppointment(reschedule.id, {
        date: reschedule.date,
        startTime: reschedule.startTime,
      });
      setReschedule(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const upcoming = appointments.filter((a) => a.status === 'booked');
  const past = appointments.filter((a) => a.status !== 'booked');

  return (
    <div className="stack">
      <div className="topbar">
        <div>
          <h1>Appointments</h1>
          <p className="muted">History across all clinics</p>
        </div>
        <Link className="btn" to="/">
          Book new
        </Link>
      </div>

      {location.state?.booked && (
        <p className="badge">Booking confirmed.</p>
      )}
      {error && <p className="error">{error}</p>}

      <section className="panel">
        <h2>Upcoming</h2>
        {upcoming.length === 0 && <p className="muted">No upcoming appointments.</p>}
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Clinic</th>
              <th>Doctor</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {upcoming.map((a) => (
              <tr key={a.id}>
                <td>
                  {dateStr(a)} · {a.startTime}
                </td>
                <td>{a.clinic?.name || '—'}</td>
                <td>{doctorName(a)}</td>
                <td className="row">
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={busyId === a.id}
                    onClick={() => openReschedule(a)}
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    className="btn danger"
                    disabled={busyId === a.id}
                    onClick={() => onCancel(a.id)}
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Past</h2>
        {past.length === 0 && <p className="muted">No past appointments.</p>}
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Clinic</th>
              <th>Doctor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {past.map((a) => (
              <tr key={a.id}>
                <td>
                  {dateStr(a)} · {a.startTime}
                </td>
                <td>{a.clinic?.name || '—'}</td>
                <td>{doctorName(a)}</td>
                <td>
                  <span className={`badge ${a.status === 'cancelled' ? 'danger' : ''}`}>
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {reschedule && (
        <div className="modal-backdrop" onClick={() => setReschedule(null)}>
          <form
            className="panel modal stack"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitReschedule}
          >
            <h2>Reschedule</h2>
            <label className="field">
              New date
              <input
                type="date"
                min={todayYmd()}
                value={reschedule.date}
                onChange={(e) =>
                  setReschedule((r) => ({ ...r, date: e.target.value, startTime: '' }))
                }
                required
              />
            </label>
            <div className="slot-grid">
              {slots.map((s) => (
                <button
                  key={s.startTime}
                  type="button"
                  className={`slot-btn ${reschedule.startTime === s.startTime ? 'active' : ''}`}
                  onClick={() => setReschedule((r) => ({ ...r, startTime: s.startTime }))}
                >
                  {s.startTime}
                </button>
              ))}
            </div>
            {slots.length === 0 && <p className="muted">No slots that day.</p>}
            <div className="row">
              <button className="btn" type="submit" disabled={busyId === reschedule.id}>
                Save
              </button>
              <button type="button" className="btn secondary" onClick={() => setReschedule(null)}>
                Close
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
