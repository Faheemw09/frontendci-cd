import { useEffect, useMemo, useState } from 'react';
import { api, todayYmd } from '../../services/api';

function monthMatrix(anchor) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

export default function AppointmentsTab() {
  const [view, setView] = useState('list');
  const [date, setDate] = useState(todayYmd());
  const [q, setQ] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [monthAppts, setMonthAppts] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [anchor, setAnchor] = useState(() => new Date());
  const [error, setError] = useState('');
  const [ticketPrompt, setTicketPrompt] = useState(null);
  const [walkIn, setWalkIn] = useState(false);
  const [reschedule, setReschedule] = useState(null);
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({
    doctorId: '',
    date: todayYmd(),
    startTime: '09:00',
    fullName: '',
    phone: '',
  });

  async function loadList(d = date) {
    const data = await api.listAppointments({ date: d });
    setAppointments(data.appointments || []);
  }

  async function loadMonth(a = anchor) {
    const start = new Date(a.getFullYear(), a.getMonth(), 1);
    const end = new Date(a.getFullYear(), a.getMonth() + 1, 0);
    // Fetch each week day range via full month booked list then filter client-side
    const data = await api.listAppointments({});
    const all = data.appointments || [];
    setMonthAppts(
      all.filter((x) => {
        const day = (x.appointmentDate || '').toString().slice(0, 10);
        return day >= ymd(start) && day <= ymd(end);
      })
    );
  }

  useEffect(() => {
    Promise.all([loadList(), api.listDoctors(), loadMonth()])
      .then(([, docs]) => setDoctors(docs.doctors || []))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    loadList(date).catch((e) => setError(e.message));
  }, [date]);

  useEffect(() => {
    loadMonth(anchor).catch(() => {});
  }, [anchor]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return appointments;
    return appointments.filter((a) => {
      const hay = `${a.patient?.fullName || ''} ${a.doctor?.user?.firstName || ''} ${a.doctor?.user?.lastName || ''} ${a.status}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [appointments, q]);

  const countsByDay = useMemo(() => {
    const map = {};
    monthAppts.forEach((a) => {
      const day = (a.appointmentDate || '').toString().slice(0, 10);
      map[day] = (map[day] || 0) + 1;
    });
    return map;
  }, [monthAppts]);

  async function cancelAppt(id) {
    const reason = window.prompt('Cancellation reason (optional)') || '';
    const result = await api.cancelAppointment(id, reason);
    if (result.offerSupportTicket) setTicketPrompt(result.supportTicketPrompt);
    await loadList();
    await loadMonth();
  }

  async function createTicketFromPrompt() {
    if (!ticketPrompt?.suggestedPayload) return;
    await api.createTicket(ticketPrompt.suggestedPayload);
    setTicketPrompt(null);
    alert('Support ticket created for the patient.');
  }

  async function submitWalkIn(e) {
    e.preventDefault();
    await api.walkIn({
      doctorId: form.doctorId,
      date: form.date,
      startTime: form.startTime,
      patient: { fullName: form.fullName, phone: form.phone },
    });
    setWalkIn(false);
    setDate(form.date);
    await loadList(form.date);
    await loadMonth();
  }

  async function openReschedule(a) {
    setReschedule(a);
    const data = await api.getSlots(a.doctorId, date);
    setSlots(data.slots || []);
  }

  async function submitReschedule(e) {
    e.preventDefault();
    await api.rescheduleAppointment(reschedule.id, {
      date: form.date,
      startTime: form.startTime,
    });
    setReschedule(null);
    setDate(form.date);
    await loadList(form.date);
    await loadMonth();
  }

  async function onRescheduleDateChange(d) {
    setForm((f) => ({ ...f, date: d, startTime: '' }));
    if (reschedule) {
      const data = await api.getSlots(reschedule.doctorId, d);
      setSlots(data.slots || []);
    }
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h2>Appointments</h2>
          <p className="muted">Calendar and list with walk-in booking</p>
        </div>
        <button className="btn" type="button" onClick={() => setWalkIn(true)}>
          Manual / walk-in
        </button>
      </div>

      <div className="tabs-inline">
        <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
          List
        </button>
        <button
          type="button"
          className={view === 'calendar' ? 'active' : ''}
          onClick={() => setView('calendar')}
        >
          Calendar
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {ticketPrompt && (
        <div className="panel" style={{ borderColor: 'var(--accent)' }}>
          <strong>Clinic cancellation</strong>
          <p className="muted">{ticketPrompt.message}</p>
          <div className="row">
            <button className="btn" type="button" onClick={createTicketFromPrompt}>
              Create support ticket
            </button>
            <button className="btn secondary" type="button" onClick={() => setTicketPrompt(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {view === 'list' && (
        <div className="panel stack">
          <div className="row">
            <label className="field">
              Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="field">
              Search
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Patient, doctor, status"
              />
            </label>
          </div>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.startTime}–{a.endTime}
                  </td>
                  <td>{a.patient?.fullName || '—'}</td>
                  <td>
                    {a.doctor?.user
                      ? `${a.doctor.user.firstName} ${a.doctor.user.lastName}`
                      : '—'}
                  </td>
                  <td>
                    <span className={`badge ${a.status === 'cancelled' ? 'danger' : ''}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="row">
                    {a.status === 'booked' && (
                      <>
                        <button className="btn secondary" type="button" onClick={() => openReschedule(a)}>
                          Reschedule
                        </button>
                        <button className="btn danger" type="button" onClick={() => cancelAppt(a.id)}>
                          Cancel
                        </button>
                        <button
                          className="btn secondary"
                          type="button"
                          onClick={() =>
                            api.updateAppointmentStatus(a.id, 'completed').then(() => loadList())
                          }
                        >
                          Complete
                        </button>
                        <button
                          className="btn secondary"
                          type="button"
                          onClick={() =>
                            api.updateAppointmentStatus(a.id, 'no_show').then(() => loadList())
                          }
                        >
                          No-show
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'calendar' && (
        <div className="panel stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <button
              className="btn secondary"
              type="button"
              onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}
            >
              Prev
            </button>
            <h3>
              {anchor.toLocaleString('en', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              className="btn secondary"
              type="button"
              onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}
            >
              Next
            </button>
          </div>
          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="muted" style={{ textAlign: 'center' }}>
                {d}
              </div>
            ))}
            {monthMatrix(anchor).map((cell, i) => {
              if (!cell) return <div key={`e-${i}`} className="cal-cell muted" />;
              const key = ymd(cell);
              return (
                <button
                  type="button"
                  key={key}
                  className={`cal-cell ${key === date ? 'selected' : ''}`}
                  onClick={() => {
                    setDate(key);
                    setView('list');
                  }}
                >
                  <div>{cell.getDate()}</div>
                  {countsByDay[key] ? <div className="count">{countsByDay[key]} appts</div> : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {walkIn && (
        <div className="modal-backdrop">
          <form className="panel modal stack" onSubmit={submitWalkIn}>
            <h3>Manual / walk-in booking</h3>
            <label className="field">
              Doctor
              <select
                required
                value={form.doctorId}
                onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
              >
                <option value="">Select</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.user?.firstName} {d.user?.lastName} — {d.specialization}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Date
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </label>
            <label className="field">
              Start time (HH:MM)
              <input
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required
              />
            </label>
            <label className="field">
              Patient name
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
              />
            </label>
            <label className="field">
              Phone
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </label>
            <div className="row">
              <button className="btn" type="submit">
                Book
              </button>
              <button className="btn secondary" type="button" onClick={() => setWalkIn(false)}>
                Close
              </button>
            </div>
          </form>
        </div>
      )}

      {reschedule && (
        <div className="modal-backdrop">
          <form className="panel modal stack" onSubmit={submitReschedule}>
            <h3>Reschedule appointment</h3>
            <label className="field">
              New date
              <input
                type="date"
                value={form.date}
                onChange={(e) => onRescheduleDateChange(e.target.value)}
                required
              />
            </label>
            <label className="field">
              Slot
              <select
                required
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              >
                <option value="">Select slot</option>
                {slots.map((s) => (
                  <option key={s.startTime} value={s.startTime}>
                    {s.startTime}–{s.endTime}
                  </option>
                ))}
              </select>
            </label>
            <div className="row">
              <button className="btn" type="submit">
                Save
              </button>
              <button className="btn secondary" type="button" onClick={() => setReschedule(null)}>
                Close
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
