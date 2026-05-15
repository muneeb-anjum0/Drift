import { LogOut, UserCircle2, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';

interface TopbarProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export const Topbar = ({ onToggleSidebar, sidebarOpen }: TopbarProps) => {
  const { user, logout } = useAuth();

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-40 flex min-h-24 items-center justify-between gap-4 border-b border-lime-400/15 bg-black/60 px-5 py-[1.60rem] backdrop-blur-md sm:px-8"
    >
      <div className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleSidebar}
          className="lg:hidden text-gray-400 hover:text-lime-400 transition-colors p-2 hover:bg-lime-400/10 rounded-full"
        >
          <Menu size={20} />
        </motion.button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Dashboard</p>
          <h1 className="text-lg font-bold text-white">Welcome Back</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <motion.div 
          whileHover={{ backgroundColor: 'rgba(34, 255, 0, 0.05)', borderColor: 'rgba(34, 255, 0, 0.3)' }}
          className="hidden items-center gap-2 rounded-full bg-black border border-lime-400/20 px-5 py-2.5 text-sm text-gray-300 md:flex transition-all duration-300"
        >
          <UserCircle2 className="h-4 w-4 text-lime-400" />
          <span>{user?.name ?? 'User'}</span>
        </motion.div>
        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => void logout()}
          className="px-5 py-2.5 rounded-full bg-black border border-red-500/20 text-gray-300 hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10 transition-all flex items-center gap-2 text-sm font-semibold"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </motion.button>
      </div>
    </motion.header>
  );
};
