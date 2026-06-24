import { DashboardStats } from '@/types';

export function DonutChart({ stats }: { stats: DashboardStats }) {
  const total = stats.total_vulnerabilities || 1; // prevent div by 0
  const critical = (stats.critical_count / total) * 100;
  const high = (stats.high_count / total) * 100;
  const medium = (stats.medium_count / total) * 100;
  const low = (stats.low_count / total) * 100;

  // Calculate SVG stroke-dasharray (circumference = 2 * pi * r ≈ 100 for r=15.915)
  // This allows us to use percentages directly
  const r = 15.91549430918954;
  const c = 100;

  let offset = 25; // Start at 12 o'clock

  const segments = [
    { value: critical, color: '#ef4444', label: 'Critical' },
    { value: high, color: '#f59e0b', label: 'High' },
    { value: medium, color: '#60a5fa', label: 'Medium' },
    { value: low, color: '#34d399', label: 'Low' },
  ].filter(s => s.value > 0);

  if (segments.length === 0) {
    return <div className="text-slate-500 text-sm">No data available</div>;
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90">
          <circle cx="21" cy="21" r={r} fill="transparent" stroke="#1e2433" strokeWidth="6" />
          {segments.map((segment, i) => {
            const strokeDasharray = `${segment.value} ${c - segment.value}`;
            const strokeDashoffset = c - offset;
            offset += segment.value;
            
            return (
              <circle
                key={i}
                cx="21"
                cy="21"
                r={r}
                fill="transparent"
                stroke={segment.color}
                strokeWidth="6"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-200">{stats.total_vulnerabilities}</span>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Total</span>
        </div>
      </div>
      
      <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs font-medium text-slate-300">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></span>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
