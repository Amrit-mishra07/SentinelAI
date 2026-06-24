import { DashboardStats } from '@/types';
import { formatCount } from '@/lib/formatters';

export function MetricCards({ stats }: { stats: DashboardStats }) {
  const cards = [
    { label: 'Total vulns', value: formatCount(stats.total_vulnerabilities), trend: '+12 vs yesterday', color: 'text-slate-200' },
    { label: 'Critical', value: formatCount(stats.critical_count), trend: '+1 vs yesterday', color: 'text-red-500' },
    { label: 'Patched', value: `${stats.patched_percentage}%`, trend: '+2% vs yesterday', color: 'text-emerald-400' },
    { label: 'Scans today', value: formatCount(stats.scans_today), trend: '+4 vs yesterday', color: 'text-indigo-400' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex flex-col justify-between">
          <div className={`text-3xl font-semibold mb-1 ${card.color}`}>{card.value}</div>
          <div className="text-sm font-medium text-slate-400 mb-3">{card.label}</div>
          <div className="text-xs text-slate-500">{card.trend}</div>
        </div>
      ))}
    </div>
  );
}
