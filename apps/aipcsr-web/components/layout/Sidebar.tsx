'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  
  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: '⌂' },
    { label: 'Repositories', href: '/repositories', icon: '◫' },
    { label: 'Scans', href: '/scans', icon: '⟳' },
    { label: 'Reports', href: '/reports', icon: '📄' },
    { label: 'AI Patches', href: '/patches', icon: '⚡' },
  ];

  return (
    <aside className="w-56 hidden md:flex flex-col bg-slate-900 border-r border-slate-800 h-full flex-shrink-0">
      <div className="h-14 flex items-center px-4 border-b border-slate-800">
        <h1 className="text-lg font-bold text-slate-200">SentinelAI</h1>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-slate-800 text-slate-200 border-l-2 border-indigo-500' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-l-2 border-transparent'
              }`}
            >
              <span className="text-lg w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
        
        <div className="my-4 border-t border-slate-800/50 pt-4">
          <Link 
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              pathname.startsWith('/settings') 
                ? 'bg-slate-800 text-slate-200 border-l-2 border-indigo-500' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-l-2 border-transparent'
            }`}
          >
            <span className="text-lg w-5 text-center">⚙</span>
            Settings
          </Link>
        </div>
      </nav>
      
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div className="truncate text-xs font-medium text-slate-400">user@example.com</div>
          <button 
            onClick={logout}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            title="Logout"
          >
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}
