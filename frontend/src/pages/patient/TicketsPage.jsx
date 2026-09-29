import { useEffect, useState } from 'react';
import { api } from '../../services/api';

const CATEGORIES = [
  'general_complaint',
  'slot_cancelled',
  'no_show_dispute',
  'refund_request',
  'billing',
  'other',
];

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    subject: '',
    description: '',
    category: 'general_complaint',
    clinicId: '',
  });
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api.listTickets();
    setTickets(data.tickets || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
    api
      .browseClinics()
      .then((data) => {
        const list = data.clinics || [];
        setClinics(list);
        if (list[0]) {
          setForm((f) => ({ ...f, clinicId: f.clinicId || list[0].id }));
        }
      })
      .catch(() => {});
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.createTicket(form);
      setForm((f) => ({
        subject: '',
        description: '',
        category: 'general_complaint',
        clinicId: f.clinicId,
      }));
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function openTicket(id) {
    setError('');
    try {
      const data = await api.getTicket(id);
      setSelected(data.ticket || data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendReply(e) {
    e.preventDefault();
    if (!selected || !reply.trim()) return;
    setBusy(true);
    try {
      await api.replyTicket(selected.id, reply);
      setReply('');
      await openTicket(selected.id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div>
        <h1>Support tickets</h1>
        <p className="muted">Raise and track issues with clinics</p>
      </div>
      {error && <p className="error">{error}</p>}

      <form className="panel stack" onSubmit={onCreate}>
        <h2>New ticket</h2>
        <label className="field">
          Clinic
          <select
            value={form.clinicId}
            onChange={(e) => setForm((f) => ({ ...f, clinicId: e.target.value }))}
            required
          >
            <option value="">Select clinic…</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Subject
          <input
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            required
            minLength={3}
          />
        </label>
        <label className="field">
          Category
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Description
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            required
            minLength={3}
          />
        </label>
        <button className="btn" type="submit" disabled={busy}>
          Submit ticket
        </button>
      </form>

      <section className="panel">
        <h2>Your tickets</h2>
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Category</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td>{t.subject}</td>
                <td>{t.category}</td>
                <td>
                  <span className="badge">{t.status}</span>
                </td>
                <td>
                  <button type="button" className="btn secondary" onClick={() => openTicket(t.id)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tickets.length === 0 && <p className="muted">No tickets yet.</p>}
      </section>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="panel modal stack" onClick={(e) => e.stopPropagation()}>
            <h2>{selected.subject}</h2>
            <p className="muted">
              {selected.category} · {selected.status}
            </p>
            <p>{selected.description}</p>
            <div className="stack">
              {(selected.messages || []).map((m) => (
                <div key={m.id} className="patient-card">
                  <strong>{m.author?.firstName || m.author?.role || 'Message'}</strong>
                  <p>{m.body}</p>
                </div>
              ))}
            </div>
            <form className="stack" onSubmit={sendReply}>
              <label className="field">
                Reply
                <textarea
                  rows={2}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  required
                />
              </label>
              <div className="row">
                <button className="btn" type="submit" disabled={busy}>
                  Send
                </button>
                <button type="button" className="btn secondary" onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
