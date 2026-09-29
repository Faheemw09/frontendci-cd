import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export default function TicketsTab() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const data = await api.listTickets();
    setTickets(data.tickets || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function openTicket(id) {
    const data = await api.getTicket(id);
    setSelected(data.ticket);
  }

  async function sendReply(e) {
    e.preventDefault();
    await api.replyTicket(selected.id, reply);
    setReply('');
    await openTicket(selected.id);
    await load();
  }

  async function setStatus(status) {
    await api.updateTicket(selected.id, { status });
    await openTicket(selected.id);
    await load();
  }

  return (
    <div className="stack">
      <div>
        <h2>Tickets</h2>
        <p className="muted">Clinic-scoped support — view, reply, resolve</p>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="row" style={{ alignItems: 'stretch' }}>
        <div className="panel" style={{ flex: 1, minWidth: 280 }}>
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Category</th>
                <th>Status</th>
                <th>Age</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => openTicket(t.id)}>
                  <td>{t.subject}</td>
                  <td>{t.category}</td>
                  <td>
                    <span className={`badge ${t.slaBreached ? 'warn' : ''}`}>{t.status}</span>
                  </td>
                  <td>{t.ageHours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="panel stack" style={{ flex: 1.2, minWidth: 300 }}>
            <h3>{selected.subject}</h3>
            <p className="muted">
              {selected.category} · {selected.status}
              {selected.linkedAppointmentId ? ` · appt ${selected.linkedAppointmentId.slice(0, 8)}` : ''}
            </p>
            <div className="stack" style={{ maxHeight: 280, overflow: 'auto' }}>
              {(selected.messages || []).map((m) => (
                <div key={m.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
                  <strong>
                    {m.author?.firstName} {m.author?.lastName}
                  </strong>{' '}
                  <span className="muted">({m.author?.role})</span>
                  <p style={{ margin: '0.25rem 0 0' }}>{m.body}</p>
                </div>
              ))}
            </div>
            <form className="stack" onSubmit={sendReply}>
              <textarea
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a reply…"
                required
              />
              <div className="row">
                <button className="btn" type="submit">
                  Reply
                </button>
                <button className="btn secondary" type="button" onClick={() => setStatus('in_progress')}>
                  In progress
                </button>
                <button className="btn secondary" type="button" onClick={() => setStatus('resolved')}>
                  Resolve
                </button>
                <button className="btn secondary" type="button" onClick={() => setStatus('closed')}>
                  Close
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
