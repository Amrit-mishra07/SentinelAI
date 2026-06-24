'use client';

import { usePathname } from 'next/navigation';

export function Topbar() {
  const pathname = usePathname();
  
  // Create breadcrumb from pathname
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumb = pathSegments.length > 0 
    ? pathSegments.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' / ')
    : 'Dashboard';

  return (
    <header className="h-14 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-6 flex-shrink-0">
      <div className="text-sm font-medium text-slate-400">
        <span className="text-slate-500">SentinelAI / </span>
        <span className="text-slate-200">{breadcrumb}</span>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="relative hidden sm:block">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            🔍
          </span>
          <input 
            type="text" 
            placeholder="Search scans, repos... (⌘K)" 
            className="bg-slate-900 border border-slate-700 rounded-md py-1.5 pl-9 pr-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-64 placeholder-slate-500"
          />
        </div>
        
        <div className="flex items-center gap-4">
          <button className="text-slate-400 hover:text-slate-200 relative">
            🔔
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-slate-950"></span>
          </button>
          
          <div className="h-7 w-7 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white">
            U
          </div>
        </div>
      </div>
    </header>
  );
}
