import type { ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import { canApprove } from '../../utils/permissions';

const navClass = ({ isActive }: { isActive: boolean }) => `v-nav-link${isActive ? ' is-active' : ''}`;

export const AppLayout = ({ children }: { children?: ReactNode }) => {
  const { user, logout } = useAuth();
  const { workspaces } = useWorkspaces();
  const navigate = useNavigate();
  const location = useLocation();
  const decisionsVisible = workspaces.some((workspace) => canApprove(workspace.role));

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="v-shell">
      <a className="v-skip" href="#main-content">Skip to content</a>
      <header className="v-topbar">
        <div className="v-topbar-inner">
          <Link to="/dashboard" className="text-xl font-bold tracking-tight" aria-label="Drift home">Drift<span className="text-[var(--v-accent)]">.</span></Link>
          <nav className="v-desktop-nav" aria-label="Primary navigation">
            <NavLink to="/dashboard" className={navClass}>Home</NavLink>
            <NavLink to="/projects" className={({ isActive }) => navClass({ isActive: isActive || location.pathname.startsWith('/projects/') })}>Projects</NavLink>
            {decisionsVisible ? <NavLink to="/approvals" className={navClass}>Decisions</NavLink> : null}
          </nav>
          <details className="v-account-menu">
            <summary aria-label="Account and more options">{user?.name?.trim() || 'Account'} <span aria-hidden="true">⌄</span></summary>
            <div className="v-account-popover">
              <Link to="/workspaces">Workspaces</Link>
              <Link to="/settings">About & runtime</Link>
              <Link to="/settings#analysis-provider">Analysis provider</Link>
              <Link to="/evaluation">Advanced diagnostics</Link>
              <Link to="/billing">Billing demo</Link>
              <button type="button" onClick={() => void handleLogout()}>Log out</button>
            </div>
          </details>
        </div>
      </header>
      <main id="main-content" className="v-main" tabIndex={-1}>{children ?? <Outlet />}</main>
      <nav className="v-mobile-nav" aria-label="Mobile navigation">
        <NavLink to="/dashboard" className={navClass}>Home</NavLink>
        <NavLink to="/projects" className={({ isActive }) => navClass({ isActive: isActive || location.pathname.startsWith('/projects/') })}>Projects</NavLink>
        {decisionsVisible ? <NavLink to="/approvals" className={navClass}>Decisions</NavLink> : null}
        <NavLink to="/workspaces" className={navClass}>Workspaces</NavLink>
      </nav>
    </div>
  );
};
