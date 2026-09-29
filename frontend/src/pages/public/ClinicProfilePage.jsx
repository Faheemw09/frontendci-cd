import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PublicLayout from '../../components/PublicLayout';
import { api } from '../../services/api';

export default function ClinicProfilePage() {
  const { slug } = useParams();
  const [clinic, setClinic] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .browseClinic(slug)
      .then((data) => {
        setClinic(data.clinic);
        setDoctors(data.doctors || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <PublicLayout>
      {loading && <p className="muted">Loading clinic…</p>}
      {error && <p className="error">{error}</p>}
      {clinic && (
        <>
          <section className="public-hero">
            <p className="eyebrow">
              <Link to="/">Clinics</Link> / {clinic.name}
            </p>
            <h1>{clinic.name}</h1>
            <p className="lede">
              {[clinic.address, clinic.city, clinic.region].filter(Boolean).join(', ')}
            </p>
            <div className="row">
              <Link className="btn" to={`/clinics/${clinic.slug}/book`}>
                Book appointment
              </Link>
              {clinic.phone && <span className="muted">{clinic.phone}</span>}
            </div>
          </section>

          <section className="stack" style={{ marginBottom: '1.5rem' }}>
            <h2>Doctors & specialties</h2>
            <p className="muted">{(clinic.specialties || []).join(' · ') || '—'}</p>
            <ul className="doctor-list">
              {doctors.map((d) => (
                <li key={d.id}>
                  <strong>
                    Dr {d.firstName} {d.lastName}
                  </strong>
                  <span className="muted"> — {d.specialization}</span>
                  {d.consultationFee != null && (
                    <span className="muted"> · ₹{d.consultationFee}</span>
                  )}
                </li>
              ))}
            </ul>
            {doctors.length === 0 && <p className="muted">No doctors listed.</p>}
          </section>

          <section>
            <h2>Location</h2>
            <iframe
              title={`Map of ${clinic.name}`}
              className="map-embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={clinic.mapEmbedUrl}
            />
          </section>
        </>
      )}
    </PublicLayout>
  );
}
