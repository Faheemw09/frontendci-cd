import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PublicLayout({ children }) {
  const { user, logout } = useAuth();
  const isPatient = user?.role === 'patient';

  return (
    <div className="public-shell">
      <header className="public-header">
        <Link to="/" className="public-brand">
          Clinicy
          <span>Find clinics · Book care</span>
        </Link>
        <nav className="public-nav">
          <NavLink to="/" end>
            Clinics
          </NavLink>
          {isPatient ? (
            <>
              <NavLink to="/account">My account</NavLink>
              <button type="button" className="btn secondary" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/account/login">Patient sign in</NavLink>
              <Link to="/account/register" className="btn">
                Create account
              </Link>
              <Link to="/login" className="link-quiet">
                Staff
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className="public-main">{children}</main>
      <footer className="public-footer">
        <p>
          Search-indexable HTML:{' '}
          <a href="/public/clinics" target="_blank" rel="noreferrer">
            /public/clinics
          </a>
        </p>
      </footer>
    </div>
  );
}
