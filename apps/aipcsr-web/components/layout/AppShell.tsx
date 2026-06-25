'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { usePathname } from 'next/navigation';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Do not render shell for login page
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-sentinel-base text-sentinel-text-primary overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-200 md:ml-[220px]">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-auto py-6 px-8">
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
