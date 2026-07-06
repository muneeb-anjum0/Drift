import { BriefcaseBusiness, FolderKanban, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import type { NavigateFunction } from 'react-router-dom';
import type { DockItemConfig } from '../navigation/Dock';
import { NAV_ITEMS } from '../../utils/constants';
import { cn } from '../../utils/cn';
import type { User } from '../../types';

const dockIcons = [LayoutDashboard, BriefcaseBusiness, FolderKanban, Settings];

export const userHandle = (user?: User | null) => user?.email?.split('@')[0] || user?.name || 'user';

export const buildDockItems = ({
  pathname,
  navigate,
  logout,
}: {
  pathname: string;
  navigate: NavigateFunction;
  logout: () => void | Promise<void>;
}): DockItemConfig[] => [
  ...NAV_ITEMS.map((navItem, index) => {
    const Icon = dockIcons[index] ?? LayoutDashboard;
    const activeRoute = navItem.to === '/projects' ? pathname.startsWith('/projects') : pathname === navItem.to;

    return {
      label: navItem.label,
      icon: <Icon />,
      onClick: () => navigate(navItem.to),
      className: cn(activeRoute && 'active'),
    };
  }),
  {
    label: 'Logout',
    icon: <LogOut />,
    onClick: () => void logout(),
    className: 'dock-logout',
  },
];
