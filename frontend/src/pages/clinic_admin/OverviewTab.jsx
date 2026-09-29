import { useEffect, useState } from 'react';
import { api, todayYmd } from '../../services/api';

export default function OverviewTab() {
  const [stats, setStats] = useState({ today: 0, booked: 0, tickets: 0, doctors: 0 });
  const [todayList, setTodayList] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const date = todayYmd();
    Promise.all([
      api.listAppointments({ date }),
      api.listAppointments({ status: 'booked' }),
      api.listTickets({ status: 'open' }),
      api.listDoctors(),
    ])
      .then(([today, booked, tickets, doctors]) => {
        setTodayList(today.appointments || []);
        setStats({
          today: (today.appointments || []).length,
          booked: (booked.appointments || []).length,
          tickets: (tickets.tickets || []).filter((t) =>
            ['open', 'in_progress'].includes(t.status)
          ).length,
          doctors: (doctors.doctors || []).filter((d) => d.isActive).length,
        });
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="stack">
      <div>
        <h2>Overview</h2>
        <p className="muted">Today’s board for your clinic</p>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="grid-stats">
        <div className="panel stat">
          <span className="muted">Today</span>
          <strong>{stats.today}</strong>
        </div>
        <div className="panel stat">
          <span className="muted">Booked ahead</span>
          <strong>{stats.booked}</strong>
        </div>
        <div className="panel stat">
          <span className="muted">Open tickets</span>
          <strong>{stats.tickets}</strong>
        </div>
        <div className="panel stat">
          <span className="muted">Active doctors</span>
          <strong>{stats.doctors}</strong>
        </div>
      </div>
      <div className="panel">
        <h3>Today’s appointments</h3>
        {!todayList.length ? (
          <p className="muted">No appointments scheduled for today.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {todayList.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.startTime}–{a.endTime}
                  </td>
                  <td>{a.patient?.fullName || a.patientId}</td>
                  <td>
                    {a.doctor?.user
                      ? `${a.doctor.user.firstName} ${a.doctor.user.lastName}`
                      : a.doctorId.slice(0, 8)}
                  </td>
                  <td>
                    <span className="badge">{a.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
