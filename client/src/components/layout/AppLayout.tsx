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
  const dockItems = buildDockItems({ pathname: location.pathname, navigate, logout });

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="sticky top-0 z-40 px-4 py-2">
        <div className="app-top-island mx-auto flex max-w-xl items-center justify-between gap-4 px-4 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--color-text)]">DriftLedger</p>
            <p className="truncate text-xs text-[var(--color-text-muted)]">Requirement drift workspace</p>
          </div>
          <div className="shrink-0 truncate pl-3 text-sm font-semibold text-[var(--color-text)]">
            {displayName}
          </div>
        </div>
      </header>

      <main className="app-main mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children ?? <Outlet />}
      </main>

      <div className="app-dock-shell">
        <Dock items={dockItems} panelHeight={58} baseItemSize={42} magnification={54} distance={130} />
      </div>
    </div>
  );
};
