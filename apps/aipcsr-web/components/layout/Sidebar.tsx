'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FolderGit2, ShieldAlert, FileBarChart, Sparkles, Settings, ChevronRight, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ProfileModal } from '../../features/auth/ProfileModal';

export const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = React.useState(false);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5 mr-3" /> },
    { label: 'Repositories', href: '/repositories', icon: <FolderGit2 className="w-5 h-5 mr-3" /> },
    { label: 'Scans', href: '/scans', icon: <ShieldAlert className="w-5 h-5 mr-3" /> },
    { label: 'Reports', href: '/reports', icon: <FileBarChart className="w-5 h-5 mr-3" /> },
    { label: 'AI Patches', href: '/patches', icon: <Sparkles className="w-5 h-5 mr-3 text-sentinel-accent" /> },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity" 
          onClick={onClose} 
        />
      )}

      {/* Sidebar Container */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-[220px] bg-sentinel-panel/80 backdrop-blur-md border-r border-sentinel-border transform transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col",
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        
        {/* Logo Section */}
        <div className="flex items-center h-14 px-6 border-b border-sentinel-border/50">
          <ShieldCheck className="w-6 h-6 mr-3 text-sentinel-accent" />
          <span className="text-base font-semibold tracking-wide text-sentinel-text-primary drop-shadow-[0_0_10px_rgba(47,129,247,0.5)]">
            SentinelAI
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose()}
                className={cn(
                  "flex items-center px-6 py-2.5 mx-2 rounded-md transition-all duration-200 text-sm font-medium",
                  isActive 
                    ? 'bg-sentinel-accent/10 text-white shadow-[inset_2px_0_0_0_rgba(47,129,247,1)]' 
                    : 'text-sentinel-text-secondary hover:bg-sentinel-elevated hover:text-sentinel-text-primary'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-sentinel-border/50 mt-auto bg-gradient-to-t from-sentinel-base/50 to-transparent">
          <Link
            href="/settings"
            onClick={() => onClose()}
            className="flex items-center px-4 py-2.5 rounded-md transition-colors text-sm font-medium text-sentinel-text-secondary hover:bg-sentinel-elevated hover:text-sentinel-text-primary"
          >
            <Settings className="w-5 h-5 mr-3" />
            Settings
          </Link>
          <div 
            className="mt-2 flex items-center px-4 py-2 hover:bg-sentinel-elevated rounded-md cursor-pointer transition-colors group"
            onClick={() => setProfileOpen(true)}
          >
            <div className="w-7 h-7 rounded-full bg-sentinel-accent/20 border border-sentinel-accent/50 flex items-center justify-center text-xs font-medium text-sentinel-accent mr-3">
              AM
            </div>
            <span className="text-[13px] font-medium text-sentinel-text-secondary truncate max-w-[110px] group-hover:text-sentinel-text-primary transition-colors">
              am@example.com
            </span>
            <ChevronRight className="w-4 h-4 ml-auto text-sentinel-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </aside>

      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
};
