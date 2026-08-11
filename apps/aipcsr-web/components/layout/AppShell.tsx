'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { usePathname, useRouter } from 'next/navigation';
import { CommandPalette } from '../ui/CommandPalette';
import { useAuth } from '../../hooks/useAuth';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { token, loading } = useAuth();

  useEffect(() => {
    if (!loading && !token && pathname !== '/login' && pathname !== '/register') {
      router.push('/login');
    }
  }, [loading, token, pathname, router]);

  // Do not render shell for login and register pages
  if (pathname === '/login' || pathname === '/register') {
    return <>{children}</>;
  }

  if (loading || !token) {
    return (
      <div className="min-h-screen bg-sentinel-base flex items-center justify-center">
        <div className="animate-pulse w-8 h-8 rounded-full bg-sentinel-accent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-sentinel-base text-sentinel-text-primary overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-200 md:ml-[220px]">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-auto py-6 px-4 md:px-8">
          <div className="w-full max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
};
