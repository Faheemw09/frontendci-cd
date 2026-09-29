import { useEffect, useState } from 'react';
import { api } from '../../services/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const emptyDoctor = {
  email: '',
  password: 'Password123!',
  firstName: '',
  lastName: '',
  phone: '',
  specialization: '',
  consultationFee: 500,
  slotDurationMinutes: 30,
};

export default function DoctorsTab() {
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyDoctor);
  const [hoursDoctor, setHoursDoctor] = useState(null);
  const [windows, setWindows] = useState([]);

  async function load() {
    const data = await api.listDoctors();
    setDoctors(data.doctors || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function createDoctor(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createDoctor(form);
      setShowForm(false);
      setForm(emptyDoctor);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function openHours(doctor) {
    setHoursDoctor(doctor);
    const data = await api.getAvailability(doctor.id);
    setWindows(
      data.availability?.length
        ? data.availability.map((w) => ({
            dayOfWeek: w.dayOfWeek,
            startTime: w.startTime,
            endTime: w.endTime,
            isActive: w.isActive,
          }))
        : [{ dayOfWeek: 1, startTime: '09:00', endTime: '13:00', isActive: true }]
    );
  }

  async function saveHours(e) {
    e.preventDefault();
    await api.replaceAvailability(hoursDoctor.id, windows);
    setHoursDoctor(null);
  }

  async function saveFee(doctor, fee) {
    await api.updateDoctor(doctor.id, { consultationFee: Number(fee) });
    await load();
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h2>Doctors</h2>
          <p className="muted">Manage profiles, fees, and weekday hours</p>
        </div>
        <button className="btn" type="button" onClick={() => setShowForm(true)}>
          Add doctor
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Specialization</th>
              <th>Fee</th>
              <th>Slot</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {doctors.map((d) => (
              <tr key={d.id}>
                <td>
                  {d.user?.firstName} {d.user?.lastName}
                  {!d.isActive && <span className="badge danger"> inactive</span>}
                </td>
                <td>{d.specialization}</td>
                <td>
                  <input
                    style={{ width: 90 }}
                    defaultValue={Number(d.consultationFee)}
                    onBlur={(e) => saveFee(d, e.target.value)}
                  />
                </td>
                <td>{d.slotDurationMinutes}m</td>
                <td className="row">
                  <button className="btn secondary" type="button" onClick={() => openHours(d)}>
                    Hours
                  </button>
                  {d.isActive && (
                    <button
                      className="btn danger"
                      type="button"
                      onClick={() => api.deactivateDoctor(d.id).then(load)}
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-backdrop">
          <form className="panel modal stack" onSubmit={createDoctor}>
            <h3>Add doctor</h3>
            {['firstName', 'lastName', 'email', 'phone', 'specialization'].map((k) => (
              <label className="field" key={k}>
                {k}
                <input
                  required={k !== 'phone'}
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                />
              </label>
            ))}
            <label className="field">
              Password
              <input
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </label>
            <div className="row">
              <button className="btn" type="submit">
                Create
              </button>
              <button className="btn secondary" type="button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {hoursDoctor && (
        <div className="modal-backdrop">
          <form className="panel modal stack" onSubmit={saveHours}>
            <h3>
              Working hours — {hoursDoctor.user?.firstName} {hoursDoctor.user?.lastName}
            </h3>
            {windows.map((w, idx) => (
              <div className="row" key={idx}>
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
                  Remove
                </button>
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
            <div className="row">
              <button className="btn" type="submit">
                Save hours
              </button>
              <button className="btn secondary" type="button" onClick={() => setHoursDoctor(null)}>
                Close
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
