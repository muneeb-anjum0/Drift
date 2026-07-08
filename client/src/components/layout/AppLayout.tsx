import type { ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Dock from '../navigation/Dock';
import { useAuth } from '../../hooks/useAuth';
import { buildDockItems, userHandle } from './appNavigation';

export const AppLayout = ({ children }: { children?: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const displayName = userHandle(user);
  const dockItems = buildDockItems({ pathname: location.pathname, navigate, logout, user });

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <main className="app-main mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8" aria-label={`Signed in as ${displayName}`}>
        {children ?? <Outlet />}
      </main>

      <div className="app-dock-shell">
        <Dock items={dockItems} panelHeight={58} baseItemSize={42} magnification={54} distance={130} />
      </div>
    </div>
  );
};
