import type { ReactNode } from 'react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const AppLayout = ({ children }: { children?: ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-black">
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
      />
      <div
        className={
          sidebarCollapsed
            ? 'flex min-h-screen flex-1 flex-col transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:pl-40'
            : 'flex min-h-screen flex-1 flex-col transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:pl-80'
        }
      >
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="fixed left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-lime-400/20 bg-black text-lime-300 shadow-2xl lg:hidden"
        >
          <span className="sr-only">Open navigation</span>
          <span className="h-0.5 w-5 rounded-full bg-lime-300 shadow-[0_7px_0_#bef264,0_-7px_0_#bef264]" />
        </button>
        <main className="flex-1 px-5 py-6 pt-20 text-white sm:px-8 lg:px-10 lg:pt-8">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
};
