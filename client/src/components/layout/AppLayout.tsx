import type { ReactNode } from 'react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const AppLayout = ({ children }: { children?: ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-black lg:flex">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
        <main className="flex-1 px-5 py-6 sm:px-8 lg:px-10 text-white">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
};
