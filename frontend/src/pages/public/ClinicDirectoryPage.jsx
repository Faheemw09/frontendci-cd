import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/PublicLayout';
import { api } from '../../services/api';

export default function ClinicDirectoryPage() {
  const [clinics, setClinics] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .browseClinics()
      .then((data) => setClinics(data.clinics || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PublicLayout>
      <section className="public-hero">
        <h1>Clinics across Kashmir</h1>
        <p className="lede">Browse private clinics and book a doctor appointment online.</p>
      </section>

      {loading && <p className="muted">Loading clinics…</p>}
      {error && <p className="error">{error}</p>}

      <div className="clinic-grid">
        {clinics.map((c) => (
          <article key={c.id} className="clinic-tile">
            <h2>
              <Link to={`/clinics/${c.slug}`}>{c.name}</Link>
            </h2>
            <p className="muted">{[c.city, c.region].filter(Boolean).join(', ') || 'Kashmir'}</p>
            <p className="specialty-line">
              {(c.specialties || []).slice(0, 4).join(' · ') || 'General care'}
            </p>
            <p className="muted">{c.doctorCount} doctor{c.doctorCount === 1 ? '' : 's'}</p>
            <div className="row">
              <Link className="btn" to={`/clinics/${c.slug}/book`}>
                Book
              </Link>
              <Link className="btn secondary" to={`/clinics/${c.slug}`}>
                Profile
              </Link>
            </div>
          </article>
        ))}
      </div>

      {!loading && !error && clinics.length === 0 && (
        <p className="muted">No active clinics yet.</p>
      )}
    </PublicLayout>
  );
}
