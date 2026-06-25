'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';

export const Topbar: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const pathname = usePathname();
  const [showSearch, setShowSearch] = useState(false);

  const formatTitle = (path: string) => {
    if (path.startsWith('/dashboard')) return 'Dashboard';
    if (path.startsWith('/repositories')) return 'Repositories';
    if (path.startsWith('/scans')) return 'Scans';
    if (path.startsWith('/reports')) return 'Reports';
    if (path.startsWith('/patches')) return 'AI Patches';
    if (path.startsWith('/settings')) return 'Settings';
    return '';
  };

  return (
    <header className="sticky top-0 z-40 flex h-[56px] w-full items-center justify-between border-b border-sentinel-border bg-sentinel-base/80 px-6 backdrop-blur-md">
      <div className="flex items-center">
        <button 
          onClick={onMenuClick}
          className="mr-4 text-sentinel-text-secondary hover:text-sentinel-text-primary md:hidden focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-[20px] font-medium text-sentinel-text-primary">
          {formatTitle(pathname)}
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* Search trigger */}
        <button 
          onClick={() => setShowSearch(true)}
          className="flex items-center px-3 py-1.5 bg-sentinel-inset border border-sentinel-border rounded-md text-[13px] text-sentinel-text-tertiary hover:border-sentinel-border-muted transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search...
          <kbd className="ml-8 hidden sm:inline-block px-1.5 py-0.5 rounded border border-sentinel-border-muted bg-sentinel-panel text-[10px] font-mono text-sentinel-text-secondary">
            ⌘K
          </kbd>
        </button>

        {/* Notification Bell */}
        <button className="relative text-sentinel-text-secondary hover:text-sentinel-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-sentinel-accent rounded-full p-1">
          <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-sentinel-accent"></span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
      </div>

      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm" onClick={() => setShowSearch(false)}>
          <div className="w-full max-w-lg bg-sentinel-panel border border-sentinel-border rounded-lg shadow-2xl p-4" onClick={e => e.stopPropagation()}>
            <input 
              type="text" 
              placeholder="Search coming soon..." 
              autoFocus
              className="w-full bg-sentinel-inset text-sentinel-text-primary border-none focus:ring-0 text-[14px]"
            />
          </div>
        </div>
      )}
    </header>
  );
};
