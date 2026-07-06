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
  const displayName = user?.email?.split('@')[0] || user?.name || 'user';

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
      <header className="sticky top-0 z-40 px-4 py-3">
        <div className="app-top-island mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--color-text)]">DriftLedger</p>
            <p className="truncate text-xs text-[var(--color-text-muted)]">Requirement drift workspace</p>
          </div>
          <div className="shrink-0 rounded-[var(--radius-control)] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-primary-text)]">
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
