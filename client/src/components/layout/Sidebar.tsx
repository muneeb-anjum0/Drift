import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, BriefcaseBusiness, Settings, ChevronLeft, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { NAV_ITEMS } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';

const icons = [LayoutDashboard, BriefcaseBusiness, FolderKanban, Settings];

const sidebarEase = [0.22, 1, 0.36, 1] as const;

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar = ({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }: SidebarProps) => {
  const { logout, user } = useAuth();

  const handleNavClick = () => {
    // Only close on mobile (small screens)
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: isOpen ? 0 : -300 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          'fixed bottom-0 left-0 top-0 z-50 flex flex-col border-r border-lime-400/10 bg-black text-white shadow-2xl transition-[width,border-radius,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:bottom-4 lg:left-4 lg:top-4 lg:z-30 lg:h-[calc(100vh-2rem)] lg:translate-x-0 lg:animate-none lg:rounded-[2rem] lg:border lg:border-lime-400/15 lg:shadow-[0_28px_90px_rgba(0,0,0,0.72),0_0_0_1px_rgba(163,230,53,0.06)]',
          isCollapsed ? 'w-32 lg:w-32' : 'w-72 lg:w-72'
        )}
      >
        {/* Header */}
        <div className={cn('relative border-b border-lime-400/10 py-6 lg:shrink-0', isCollapsed ? 'px-4' : 'px-6')}>
          <div className="flex items-center justify-between gap-2">
            <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 360, damping: 28 }}>
              <h1 className="flex items-baseline whitespace-nowrap text-2xl font-black tracking-tight">
                <span className="text-lime-400">Drift</span>
                <span
                  className={cn(
                    'ml-1 inline-block overflow-hidden text-white transition-[max-width,opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                    isCollapsed ? 'max-w-0 -translate-x-1 opacity-0' : 'max-w-24 translate-x-0 opacity-100'
                  )}
                >
                  Ledger
                </span>
              </h1>
            </motion.div>
            <motion.button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              whileHover={{ scale: 1.08, rotate: isCollapsed ? 0 : -4 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-lime-300 transition hover:border-lime-400/30 hover:bg-lime-400/10 lg:flex"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <motion.span animate={{ rotate: isCollapsed ? 0 : 180 }} transition={{ duration: 0.35, ease: sidebarEase }}>
                {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </motion.span>
            </motion.button>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(false)}
            className="text-gray-400 transition-colors hover:text-lime-400 lg:hidden"
          >
            <ChevronLeft size={20} />
          </motion.button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
          {NAV_ITEMS.map((item, index) => {
            const Icon = icons[index] ?? LayoutDashboard;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  cn(
                    'group relative flex h-12 items-center rounded-full text-sm font-semibold transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                    isCollapsed && 'justify-center gap-0 px-0',
                    !isCollapsed && 'gap-3 px-5',
                    isActive
                      ? 'bg-lime-400 text-black shadow-[0_12px_34px_rgba(163,230,53,0.28)]'
                      : 'border border-transparent text-gray-300 hover:border-lime-400/20 hover:bg-lime-400/10 hover:text-lime-200'
                  )
                }
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span
                  className={cn(
                    'overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                    isCollapsed ? 'max-w-0 -translate-x-2 opacity-0' : 'max-w-36 translate-x-0 opacity-100'
                  )}
                >
                  {item.label}
                </span>
                {isCollapsed ? <span className="sr-only">{item.label}</span> : null}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={cn('shrink-0 border-t border-lime-400/10 py-5', isCollapsed ? 'px-3' : 'px-5')}>
          <div
            className={cn(
              'mb-3 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.03] transition-[max-height,opacity,margin,padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
              isCollapsed ? 'max-h-0 border-transparent p-0 opacity-0' : 'max-h-28 p-4 opacity-100'
            )}
          >
                <p className="truncate text-sm font-semibold text-white">{user?.name || 'DriftLedger user'}</p>
                <p className="mt-1 truncate text-xs text-gray-500">{user?.email || 'Signed in'}</p>
          </div>
          <motion.button
            type="button"
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => void logout()}
            className={cn(
              'flex h-11 w-full items-center justify-center rounded-full border border-lime-400/20 bg-lime-400/10 text-sm font-semibold text-lime-200 transition hover:border-lime-400/40 hover:bg-lime-400/15',
              isCollapsed ? 'gap-0' : 'gap-2'
            )}
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
            <span
              className={cn(
                'overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                isCollapsed ? 'max-w-0 -translate-x-2 opacity-0' : 'max-w-24 translate-x-0 opacity-100'
              )}
            >
              Logout
            </span>
          </motion.button>
        </div>
      </motion.aside>
    </>
  );
};
