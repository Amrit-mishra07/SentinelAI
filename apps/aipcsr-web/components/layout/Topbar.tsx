'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Search, Bell, CheckCircle2, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatRelative } from '../../lib/formatters';

export const Topbar: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTitle = (path: string) => {
    if (path.startsWith('/dashboard')) return 'Dashboard';
    if (path.startsWith('/repositories')) return 'Repositories';
    if (path.startsWith('/scans')) return 'Scans';
    if (path.startsWith('/reports')) return 'Reports';
    if (path.startsWith('/patches')) return 'AI Patches';
    if (path.startsWith('/settings')) return 'Settings';
    return '';
  };

  const openSearch = () => {
    window.dispatchEvent(new Event('sentinelai:open-search'));
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-sentinel-border bg-sentinel-base/80 px-6 backdrop-blur-md">
      <div className="flex items-center">
        <button 
          onClick={onMenuClick}
          className="mr-4 text-sentinel-text-secondary hover:text-sentinel-text-primary md:hidden focus:outline-none transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-medium text-sentinel-text-primary tracking-tight">
          {formatTitle(pathname)}
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* Search trigger */}
        <button 
          onClick={openSearch}
          className="flex items-center px-3 py-1.5 bg-sentinel-panel/50 border border-sentinel-border rounded-md text-[13px] text-sentinel-text-tertiary hover:border-sentinel-border-muted transition-colors w-64 justify-between"
        >
          <span className="flex items-center">
            <Search className="w-4 h-4 mr-2" />
            Search...
          </span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded border border-sentinel-border bg-sentinel-base text-[10px] font-mono text-sentinel-text-secondary shadow-sm">
            ⌘K
          </kbd>
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-sentinel-text-secondary hover:text-sentinel-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-sentinel-accent rounded-full p-1.5 hover:bg-sentinel-elevated"
          >
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-sentinel-accent">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sentinel-accent opacity-75"></span>
            </span>
            <Bell className="w-5 h-5" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-sentinel-panel border border-sentinel-border rounded-lg shadow-2xl overflow-hidden animate-slide-in-right" style={{ animationDuration: '0.2s' }}>
              <div className="p-3 border-b border-sentinel-border bg-sentinel-base/50 flex justify-between items-center">
                <h3 className="text-sm font-medium text-sentinel-text-primary">Notifications</h3>
                <span className="text-xs text-sentinel-accent cursor-pointer hover:underline">Mark all read</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <div className="p-3 border-b border-sentinel-border/50 hover:bg-sentinel-elevated transition-colors cursor-pointer flex gap-3">
                  <div className="mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-sentinel-completed" />
                  </div>
                  <div>
                    <p className="text-[13px] text-sentinel-text-primary">Scan completed for <span className="font-mono">frontend-monorepo</span></p>
                    <p className="text-[11px] text-sentinel-text-secondary mt-1">Found 3 vulnerabilities. Patches generated.</p>
                    <p className="text-[10px] text-sentinel-text-tertiary mt-2">Just now</p>
                  </div>
                </div>
                <div className="p-3 hover:bg-sentinel-elevated transition-colors cursor-pointer flex gap-3">
                  <div className="mt-0.5">
                    <ShieldAlert className="w-4 h-4 text-sentinel-critical" />
                  </div>
                  <div>
                    <p className="text-[13px] text-sentinel-text-primary">High severity vulnerability found</p>
                    <p className="text-[11px] text-sentinel-text-secondary mt-1">SQL Injection detected in <span className="font-mono">auth.py</span></p>
                    <p className="text-[10px] text-sentinel-text-tertiary mt-2">2 hours ago</p>
                  </div>
                </div>
              </div>
              <div className="p-2 border-t border-sentinel-border bg-sentinel-base/50 text-center">
                <button className="text-[12px] text-sentinel-text-secondary hover:text-sentinel-text-primary">
                  View all activity
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
