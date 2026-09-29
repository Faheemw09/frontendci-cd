import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'clinics', label: 'Clinics' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'issues', label: 'Platform log' },
];

export default function SuperAdminDashboard() {
  const { user, loading, logout } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [ticketMeta, setTicketMeta] = useState(null);
  const [slaOnly, setSlaOnly] = useState(false);
  const [issues, setIssues] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [issueForm, setIssueForm] = useState({
    title: '',
    description: '',
    category: 'billing',
    severity: 'medium',
  });

  async function loadAll() {
    const [s, c, t, i] = await Promise.all([
      api.adminStats(),
      api.listClinics(),
      api.listTickets(slaOnly ? { slaBreached: 'true' } : {}),
      api.listPlatformIssues(),
    ]);
    setStats(s.stats);
    setClinics(c.clinics || []);
    setTickets(t.tickets || []);
    setTicketMeta(t.meta || null);
    setIssues(i.issues || []);
  }

  useEffect(() => {
    if (user?.role !== 'super_admin') return;
    loadAll().catch((e) => setError(e.message));
  }, [user, slaOnly]);

  const planCounts = useMemo(() => {
    const map = { free: 0, basic: 0, pro: 0 };
    clinics.forEach((c) => {
      map[c.plan] = (map[c.plan] || 0) + 1;
    });
    return map;
  }, [clinics]);

  async function setPlan(id, plan) {
    await api.updateClinicAdmin(id, { plan });
    await loadAll();
  }

  async function openTicket(id) {
    const data = await api.getTicket(id);
    setSelectedTicket(data.ticket);
  }

  if (loading) return <p className="muted" style={{ padding: 24 }}>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'super_admin') {
    return (
      <div className="login-page">
        <div className="panel stack">
          <h2>Super admin only</h2>
          <button className="btn" type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          Clinicy
          <span>Super admin</span>
        </div>
        <nav className="stack" style={{ gap: 4 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`nav-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <p className="muted" style={{ color: '#c9d8d3', padding: '0 0.5rem' }}>
            {user.email}
          </p>
          <button className="nav-btn" type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main stack">
        {error && <p className="error">{error}</p>}

        {tab === 'overview' && stats && (
          <>
            <div>
              <h2>Platform overview</h2>
              <p className="muted">Clinics, bookings, and ticket health</p>
            </div>
            <div className="grid-stats">
              <div className="panel stat">
                <span className="muted">Total clinics</span>
                <strong>{stats.totalClinics}</strong>
              </div>
              <div className="panel stat">
                <span className="muted">Active</span>
                <strong>{stats.activeClinics}</strong>
              </div>
              <div className="panel stat">
                <span className="muted">Inactive / suspended</span>
                <strong>{stats.inactiveClinics}</strong>
              </div>
              <div className="panel stat">
                <span className="muted">Bookings this month</span>
                <strong>{stats.bookingsThisMonth}</strong>
              </div>
            </div>
            <div className="grid-stats">
              <div className="panel stat">
                <span className="muted">Pending approval</span>
                <strong>{stats.pendingClinics}</strong>
              </div>
              <div className="panel stat">
                <span className="muted">Open tickets</span>
                <strong>{stats.openTickets}</strong>
              </div>
              <div className="panel stat">
                <span className="muted">SLA breached (&gt;{stats.slaHours}h)</span>
                <strong>{stats.slaBreachedTickets}</strong>
              </div>
              <div className="panel stat">
                <span className="muted">Platform issues open</span>
                <strong>{stats.openPlatformIssues}</strong>
              </div>
            </div>
            <div className="panel">
              <h3>Plans</h3>
              <p className="muted">
                Free {planCounts.free} · Basic {planCounts.basic} · Pro {planCounts.pro}
              </p>
            </div>
          </>
        )}

        {tab === 'clinics' && (
          <>
            <div>
              <h2>All clinics</h2>
              <p className="muted">Approve, suspend, and set plan</p>
            </div>
            <div className="panel">
              <table>
                <thead>
                  <tr>
                    <th>Clinic</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>City</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {clinics.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.name}</strong>
                        <div className="muted">{c.slug}</div>
                      </td>
                      <td>
                        <select
                          value={c.plan || 'basic'}
                          onChange={(e) => setPlan(c.id, e.target.value)}
                        >
                          <option value="free">free</option>
                          <option value="basic">basic</option>
                          <option value="pro">pro</option>
                        </select>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            c.status === 'suspended'
                              ? 'danger'
                              : c.status === 'pending'
                                ? 'warn'
                                : ''
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td>{c.city || '—'}</td>
                      <td className="row">
                        {c.status !== 'active' && (
                          <button
                            className="btn"
                            type="button"
                            onClick={() => api.approveClinic(c.id).then(loadAll)}
                          >
                            Approve
                          </button>
                        )}
                        {c.status !== 'suspended' && (
                          <button
                            className="btn danger"
                            type="button"
                            onClick={() => api.suspendClinic(c.id).then(loadAll)}
                          >
                            Suspend
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'tickets' && (
          <>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <h2>All clinic tickets</h2>
                <p className="muted">
                  Cross-tenant view
                  {ticketMeta
                    ? ` · ${ticketMeta.breachedCount} SLA breached / ${ticketMeta.openCount} open`
                    : ''}
                </p>
              </div>
              <label className="row">
                <input
                  type="checkbox"
                  checked={slaOnly}
                  onChange={(e) => setSlaOnly(e.target.checked)}
                />
                SLA breached only
              </label>
            </div>
            <div className="row" style={{ alignItems: 'stretch' }}>
              <div className="panel" style={{ flex: 1 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Clinic</th>
                      <th>Status</th>
                      <th>Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr
                        key={t.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => openTicket(t.id)}
                      >
                        <td>
                          {t.subject}
                          {t.slaBreached && <span className="badge warn"> SLA</span>}
                        </td>
                        <td>{t.clinic?.name || t.clinicId?.slice(0, 8)}</td>
                        <td>{t.status}</td>
                        <td>{t.ageHours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selectedTicket && (
                <div className="panel stack" style={{ flex: 1 }}>
                  <h3>{selectedTicket.subject}</h3>
                  <p className="muted">
                    {selectedTicket.clinic?.name} · {selectedTicket.category}
                  </p>
                  <div className="stack" style={{ maxHeight: 240, overflow: 'auto' }}>
                    {(selectedTicket.messages || []).map((m) => (
                      <div key={m.id}>
                        <strong>
                          {m.author?.firstName} {m.author?.lastName}
                        </strong>
                        <p style={{ margin: '0.2rem 0 0.6rem' }}>{m.body}</p>
                      </div>
                    ))}
                  </div>
                  <form
                    className="stack"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await api.replyTicket(selectedTicket.id, reply);
                      setReply('');
                      await openTicket(selectedTicket.id);
                      await loadAll();
                    }}
                  >
                    <textarea
                      rows={3}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      required
                    />
                    <div className="row">
                      <button className="btn" type="submit">
                        Reply
                      </button>
                      <button
                        className="btn secondary"
                        type="button"
                        onClick={() =>
                          api
                            .updateTicket(selectedTicket.id, { status: 'resolved' })
                            .then(() => openTicket(selectedTicket.id))
                            .then(loadAll)
                        }
                      >
                        Resolve
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'issues' && (
          <>
            <div>
              <h2>Platform issue log</h2>
              <p className="muted">Non-clinic problems (billing, outages, account disputes)</p>
            </div>
            <form
              className="panel stack"
              onSubmit={async (e) => {
                e.preventDefault();
                await api.createPlatformIssue(issueForm);
                setIssueForm({
                  title: '',
                  description: '',
                  category: 'billing',
                  severity: 'medium',
                });
                await loadAll();
              }}
            >
              <h3>Log new issue</h3>
              <label className="field">
                Title
                <input
                  value={issueForm.title}
                  onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
                  required
                />
              </label>
              <label className="field">
                Description
                <textarea
                  rows={3}
                  value={issueForm.description}
                  onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                  required
                />
              </label>
              <div className="row">
                <label className="field">
                  Category
                  <select
                    value={issueForm.category}
                    onChange={(e) => setIssueForm({ ...issueForm, category: e.target.value })}
                  >
                    <option value="billing">billing</option>
                    <option value="outage">outage</option>
                    <option value="account">account</option>
                    <option value="security">security</option>
                    <option value="general">general</option>
                  </select>
                </label>
                <label className="field">
                  Severity
                  <select
                    value={issueForm.severity}
                    onChange={(e) => setIssueForm({ ...issueForm, severity: e.target.value })}
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="critical">critical</option>
                  </select>
                </label>
              </div>
              <button className="btn" type="submit">
                Add to log
              </button>
            </form>

            <div className="panel">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue) => (
                    <tr key={issue.id}>
                      <td>
                        <strong>{issue.title}</strong>
                        <div className="muted">{issue.description.slice(0, 80)}</div>
                      </td>
                      <td>{issue.category}</td>
                      <td>
                        <span
                          className={`badge ${
                            issue.severity === 'critical' || issue.severity === 'high'
                              ? 'danger'
                              : issue.severity === 'medium'
                                ? 'warn'
                                : ''
                          }`}
                        >
                          {issue.severity}
                        </span>
                      </td>
                      <td>{issue.status}</td>
                      <td className="row">
                        {issue.status !== 'investigating' && (
                          <button
                            className="btn secondary"
                            type="button"
                            onClick={() =>
                              api
                                .updatePlatformIssue(issue.id, { status: 'investigating' })
                                .then(loadAll)
                            }
                          >
                            Investigate
                          </button>
                        )}
                        {issue.status !== 'resolved' && (
                          <button
                            className="btn"
                            type="button"
                            onClick={() =>
                              api
                                .updatePlatformIssue(issue.id, { status: 'resolved' })
                                .then(loadAll)
                            }
                          >
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
