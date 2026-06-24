import { DashboardStats } from '@/types';
import { useEffect, useState } from 'react';

export function SeverityBarChart({ stats }: { stats: DashboardStats }) {
  const maxVal = Math.max(stats.critical_count, stats.high_count, stats.medium_count, stats.low_count, 1);
  
  const [widths, setWidths] = useState({ critical: 0, high: 0, medium: 0, low: 0 });

  useEffect(() => {
    // Animate bars on mount
    const timer = setTimeout(() => {
      setWidths({
        critical: (stats.critical_count / maxVal) * 100,
        high: (stats.high_count / maxVal) * 100,
        medium: (stats.medium_count / maxVal) * 100,
        low: (stats.low_count / maxVal) * 100,
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [stats, maxVal]);

  const bars = [
    { label: 'Critical', count: stats.critical_count, width: widths.critical, color: 'bg-red-500' },
    { label: 'High', count: stats.high_count, width: widths.high, color: 'bg-amber-500' },
    { label: 'Medium', count: stats.medium_count, width: widths.medium, color: 'bg-blue-400' },
    { label: 'Low', count: stats.low_count, width: widths.low, color: 'bg-emerald-400' },
  ];

  return (
    <div className="space-y-4 py-2">
      {bars.map((bar) => (
        <div key={bar.label} className="group flex items-center gap-4 relative">
          <div className="w-16 text-sm font-medium text-slate-400 text-right">{bar.label}</div>
          <div className="flex-1 h-6 bg-slate-800 rounded overflow-hidden flex items-center">
            <div 
              className={`h-full ${bar.color} transition-all duration-1000 ease-out`}
              style={{ width: `${bar.width}%` }}
            />
          </div>
          <div className="w-10 text-sm font-bold text-slate-200">{bar.count}</div>
          
          {/* Tooltip */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-8 bg-slate-800 text-slate-200 text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-lg border border-slate-700">
            {bar.count} vulnerabilities ({Math.round(bar.count / Math.max(1, stats.total_vulnerabilities) * 100)}%)
          </div>
        </div>
      ))}
    </div>
  );
}
