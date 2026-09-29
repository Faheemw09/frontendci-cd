import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PublicLayout from '../../components/PublicLayout';
import { useAuth } from '../../context/AuthContext';
import { api, todayYmd } from '../../services/api';

export default function BookingPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [clinic, setClinic] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState(searchParams.get('doctor') || '');
  const [date, setDate] = useState(searchParams.get('date') || todayYmd());
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    api
      .browseClinic(slug)
      .then((data) => {
        setClinic(data.clinic);
        setDoctors(data.doctors || []);
        if (!doctorId && data.doctors?.[0]) {
          setDoctorId(data.doctors[0].id);
        }
      })
      .catch((err) => setError(err.message));
  }, [slug]);

  useEffect(() => {
    if (!doctorId || !date) return;
    setLoadingSlots(true);
    setSlot(null);
    setSearchParams({ doctor: doctorId, date }, { replace: true });
    api
      .browseSlots(doctorId, date)
      .then((data) => setSlots(data.slots || []))
      .catch((err) => {
        setSlots([]);
        setError(err.message);
      })
      .finally(() => setLoadingSlots(false));
  }, [doctorId, date]);

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === doctorId),
    [doctors, doctorId]
  );

  async function onConfirm(e) {
    e.preventDefault();
    setError('');
    if (!user || user.role !== 'patient') {
      navigate('/account/login', {
        state: { from: `/clinics/${slug}/book?doctor=${doctorId}&date=${date}` },
      });
      return;
    }
    if (!slot) {
      setError('Pick a time slot');
      return;
    }
    setBusy(true);
    try {
      await api.confirmBooking({
        doctorId,
        date,
        startTime: slot.startTime,
        notes: notes || undefined,
      });
      navigate('/account/appointments', { state: { booked: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicLayout>
      <section className="public-hero">
        <p className="eyebrow">
          <Link to={`/clinics/${slug}`}>{clinic?.name || 'Clinic'}</Link> / Book
        </p>
        <h1>Book an appointment</h1>
        <p className="lede">Choose a doctor, date, and available slot.</p>
      </section>

      <form className="panel stack booking-flow" onSubmit={onConfirm}>
        <label className="field">
          Doctor
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            required
          >
            <option value="">Select…</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                Dr {d.firstName} {d.lastName} — {d.specialization}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          Date
          <input
            type="date"
            value={date}
            min={todayYmd()}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>

        <div>
          <p className="field-label">Available slots</p>
          {loadingSlots && <p className="muted">Loading slots…</p>}
          {!loadingSlots && slots.length === 0 && (
            <p className="muted">No open slots for this date.</p>
          )}
          <div className="slot-grid">
            {slots.map((s) => (
              <button
                key={s.startTime}
                type="button"
                className={`slot-btn ${slot?.startTime === s.startTime ? 'active' : ''}`}
                onClick={() => setSlot(s)}
              >
                {s.startTime}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          Notes (optional)
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for visit…"
          />
        </label>

        {selectedDoctor && slot && (
          <p className="muted">
            Confirming with Dr {selectedDoctor.firstName} {selectedDoctor.lastName} on {date} at{' '}
            {slot.startTime}
            {user?.role !== 'patient' ? ' — sign in as a patient to finish.' : '.'}
          </p>
        )}

        {error && <p className="error">{error}</p>}

        <button className="btn" type="submit" disabled={busy || !slot}>
          {busy ? 'Booking…' : user?.role === 'patient' ? 'Confirm booking' : 'Sign in to book'}
        </button>
      </form>
    </PublicLayout>
  );
}
