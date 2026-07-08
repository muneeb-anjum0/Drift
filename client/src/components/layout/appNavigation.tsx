import { BadgeCheck, BriefcaseBusiness, FolderKanban, Gauge, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import type { NavigateFunction } from 'react-router-dom';
import type { DockItemConfig } from '../navigation/Dock';
import { NAV_ITEMS } from '../../utils/constants';
import { cn } from '../../utils/cn';
import type { User } from '../../types';

const dockIcons = [LayoutDashboard, BriefcaseBusiness, FolderKanban, Gauge, BadgeCheck, Settings];
const dockDescriptions = [
  'Command center',
  'Client workspaces',
  'Scope and baselines',
  'Model quality reports',
  'Client approvals',
  'Account preferences',
];

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
      description: dockDescriptions[index],
      icon: <Icon />,
      onClick: () => navigate(navItem.to),
      className: cn(activeRoute && 'active'),
    };
  }),
  {
    label: 'Logout',
    description: 'End this session',
    icon: <LogOut />,
    onClick: () => {
      if (window.confirm('Log out of DriftLedger?')) {
        void logout();
      }
    },
    className: 'dock-logout',
  },
];
