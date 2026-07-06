import type { ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BriefcaseBusiness, FolderKanban, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import Dock, { type DockItemConfig } from '../navigation/Dock';
import { NAV_ITEMS } from '../../utils/constants';
import { cn } from '../../utils/cn';
import { useAuth } from '../../hooks/useAuth';

const icons = [LayoutDashboard, BriefcaseBusiness, FolderKanban, Settings];

export const AppLayout = ({ children }: { children?: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const dockItems: DockItemConfig[] = [
    ...NAV_ITEMS.map((item, index) => {
      const Icon = icons[index] ?? LayoutDashboard;
      const isActive = item.to === '/projects'
        ? location.pathname.startsWith('/projects')
        : location.pathname === item.to;

      return {
        label: item.label,
        icon: <Icon />,
        onClick: () => navigate(item.to),
        className: cn(isActive && 'active'),
      };
    }),
    {
      label: 'Logout',
      icon: <LogOut />,
      onClick: () => void logout(),
      className: 'dock-logout',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg-soft)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-soft)]">DriftLedger</p>
            <h1 className="text-xl font-semibold text-[var(--color-text)] sm:text-2xl">Requirement drift workspace</h1>
          </div>
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-semibold text-[var(--color-text)]">{user?.name || 'DriftLedger user'}</p>
            <p className="truncate text-xs text-[var(--color-text-muted)]">{user?.email || 'Signed in'}</p>
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
