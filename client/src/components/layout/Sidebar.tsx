import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, BriefcaseBusiness, Settings, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { NAV_ITEMS } from '../../utils/constants';

const icons = [LayoutDashboard, BriefcaseBusiness, FolderKanban, Settings];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
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
        className="fixed inset-y-0 left-0 w-72 bg-black border-r border-lime-400/10 text-white shadow-2xl z-50 flex flex-col lg:relative lg:inset-auto lg:z-0 lg:translate-x-0 lg:w-72 lg:min-h-screen lg:h-auto lg:self-stretch lg:animate-none"
      >
        {/* Header */}
        <div className="border-b border-lime-400/10 px-8 py-8 flex items-center justify-between">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-3"
          >
            <h1 className="text-2xl font-black tracking-tight">
              <span className="text-lime-400">Drift</span>
              <span className="text-white ml-1">Ledger</span>
            </h1>
          </motion.div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(false)}
            className="lg:hidden text-gray-400 hover:text-lime-400 transition-colors"
          >
            <ChevronLeft size={20} />
          </motion.button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-2 p-4 overflow-y-auto">
          {NAV_ITEMS.map((item, index) => {
            const Icon = icons[index] ?? LayoutDashboard;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-full px-5 py-3 text-sm font-semibold transition-all duration-300 group relative',
                    isActive
                      ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/40'
                      : 'text-gray-300 hover:bg-lime-400/10 hover:text-lime-400'
                  )
                }
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-lime-400/10 px-6 py-6">
          <p className="text-xs text-gray-500 leading-relaxed">
            DriftLedger v1.0
          </p>
        </div>
      </motion.aside>
    </>
  );
};
