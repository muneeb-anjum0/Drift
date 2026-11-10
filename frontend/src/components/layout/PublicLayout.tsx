import { Link, Outlet, useLocation } from 'react-router-dom';
import './PublicLayout.css';

export const PublicLayout = () => {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <div className="public-layout">
      <header className="public-header">
        <Link to="/" className="public-logo" aria-label="Drift home">
          Drift<span>.</span>
        </Link>
        <nav aria-label="Public navigation">
          <Link to={isHome ? '/login' : '/'} className="public-nav-link">
            {isHome ? 'Sign in' : 'Back to home'}
          </Link>
        </nav>
      </header>
      <Outlet />
    </div>
  );
};
