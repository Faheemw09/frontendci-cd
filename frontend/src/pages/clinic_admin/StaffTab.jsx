import { useEffect, useState } from 'react';
import { api } from '../../services/api';

const empty = {
  email: '',
  password: 'Password123!',
  firstName: '',
  lastName: '',
  phone: '',
  role: 'staff',
};

export default function StaffTab() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(empty);
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const data = await api.listUsers();
    setUsers((data.users || []).filter((u) => u.role === 'staff' || u.role === 'clinic_admin'));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function invite(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createUser(form);
      setShow(false);
      setForm(empty);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h2>Staff</h2>
          <p className="muted">
            Receptionist accounts — appointments, patients, tickets only (no settings/doctor admin)
          </p>
        </div>
        <button className="btn" type="button" onClick={() => setShow(true)}>
          Invite staff
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  {u.firstName} {u.lastName}
                </td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>
                  <span className={`badge ${u.isActive ? '' : 'danger'}`}>
                    {u.isActive ? 'active' : 'inactive'}
                  </span>
                </td>
                <td>
                  {u.role === 'staff' && u.isActive && (
                    <button
                      className="btn danger"
                      type="button"
                      onClick={() => api.deactivateUser(u.id).then(load)}
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

      {show && (
        <div className="modal-backdrop">
          <form className="panel modal stack" onSubmit={invite}>
            <h3>Invite receptionist / staff</h3>
            <label className="field">
              Role
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="staff">staff (restricted)</option>
                <option value="clinic_admin">clinic_admin</option>
              </select>
            </label>
            {['firstName', 'lastName', 'email', 'phone', 'password'].map((k) => (
              <label className="field" key={k}>
                {k}
                <input
                  required={k !== 'phone'}
                  type={k === 'password' ? 'password' : 'text'}
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                />
              </label>
            ))}
            <div className="row">
              <button className="btn" type="submit">
                Create
              </button>
              <button className="btn secondary" type="button" onClick={() => setShow(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
